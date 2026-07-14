import { createAdminClient } from '@/lib/supabase/admin';

// Threshold: |Δ avg-sentiment| that fires an alert. Sentiment is on a
// -1..+1 scale so 0.3 is a meaningful swing (roughly "positive" → "neutral")
// without being noisy on tiny sample sizes.
export const DRIFT_THRESHOLD = 0.3;

// Minimum scans in a week for the average to be trusted. Below this we
// silently skip — one grumpy scan shouldn't page a marketing team.
export const MIN_SAMPLE_SIZE = 2;

export type DriftSnapshot = {
    workspace_id: string;
    prompt:       string;
    platform:     string;
    week_start:   string; // YYYY-MM-DD
    avg_sentiment: number;
    sample_size:   number;
};

export type DriftAlert = {
    workspace_id: string;
    workspace_name: string;
    prompt:   string;
    platform: string;
    current:  number;
    prior:    number;
    delta:    number;
    direction: 'up' | 'down';
    sample_size: number;
};

// Monday 00:00 UTC of the week containing `d`. All snapshots align to this
// so week-over-week comparisons work with a straight date subtraction.
export function weekStart(d: Date): Date {
    const w = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = w.getUTCDay(); // 0=Sun
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    w.setUTCDate(w.getUTCDate() + mondayOffset);
    return w;
}

export function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

// Compute weekly rollups from raw llm_scans for a given week.
// Idempotent — safe to re-run for the same week.
export async function computeAndStoreSnapshots(targetWeekStart: Date) {
    const db = createAdminClient();
    const start = isoDate(targetWeekStart);
    const endDate = new Date(targetWeekStart);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
    const end = isoDate(endDate);

    const { data: scans, error } = await db
        .from('llm_scans')
        .select('workspace_id, prompt, platform, sentiment_score')
        .gte('created_at', start)
        .lt('created_at', end)
        .not('sentiment_score', 'is', null);

    if (error) throw new Error(`Failed to load scans for ${start}: ${error.message}`);
    if (!scans?.length) return { snapshots: [] as DriftSnapshot[] };

    const buckets = new Map<string, { sum: number; n: number; workspace_id: string; prompt: string; platform: string }>();
    for (const s of scans) {
        const key = `${s.workspace_id}|${s.prompt}|${s.platform}`;
        const b = buckets.get(key);
        if (b) { b.sum += Number(s.sentiment_score); b.n++; }
        else buckets.set(key, {
            sum: Number(s.sentiment_score),
            n: 1,
            workspace_id: s.workspace_id,
            prompt:       s.prompt,
            platform:     s.platform,
        });
    }

    const snapshots: DriftSnapshot[] = [];
    for (const b of buckets.values()) {
        snapshots.push({
            workspace_id:  b.workspace_id,
            prompt:        b.prompt,
            platform:      b.platform,
            week_start:    start,
            avg_sentiment: b.sum / b.n,
            sample_size:   b.n,
        });
    }

    const { error: upsertErr } = await db
        .from('sentiment_drift_snapshots')
        .upsert(snapshots, { onConflict: 'workspace_id,prompt,platform,week_start' });

    if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);
    return { snapshots };
}

// Find drift alerts by comparing `currentWeek` snapshots vs the previous week.
export async function detectDrift(currentWeekStart: Date): Promise<DriftAlert[]> {
    const db = createAdminClient();
    const priorWeekStart = new Date(currentWeekStart);
    priorWeekStart.setUTCDate(priorWeekStart.getUTCDate() - 7);

    const { data: rows, error } = await db
        .from('sentiment_drift_snapshots')
        .select('workspace_id, prompt, platform, week_start, avg_sentiment, sample_size, workspaces(name)')
        .in('week_start', [isoDate(currentWeekStart), isoDate(priorWeekStart)]);

    if (error) throw new Error(`Snapshot read failed: ${error.message}`);
    if (!rows?.length) return [];

    const current = new Map<string, typeof rows[0]>();
    const prior   = new Map<string, typeof rows[0]>();
    for (const r of rows) {
        const key = `${r.workspace_id}|${r.prompt}|${r.platform}`;
        if (r.week_start === isoDate(currentWeekStart)) current.set(key, r);
        else prior.set(key, r);
    }

    const alerts: DriftAlert[] = [];
    for (const [key, c] of current) {
        const p = prior.get(key);
        if (!p) continue;
        if (c.sample_size < MIN_SAMPLE_SIZE || p.sample_size < MIN_SAMPLE_SIZE) continue;
        const delta = Number(c.avg_sentiment) - Number(p.avg_sentiment);
        if (Math.abs(delta) < DRIFT_THRESHOLD) continue;

        alerts.push({
            workspace_id:   c.workspace_id,
            workspace_name: (c.workspaces as unknown as { name: string } | null)?.name ?? 'workspace',
            prompt:         c.prompt,
            platform:       c.platform,
            current:        Number(c.avg_sentiment),
            prior:          Number(p.avg_sentiment),
            delta,
            direction:      delta > 0 ? 'up' : 'down',
            sample_size:    c.sample_size,
        });
    }

    return alerts;
}

// Fetch the last 12 weeks of drift snapshots for a workspace, grouped by
// (prompt, platform). Powers the /dashboard/drift page.
export async function loadDriftHistory(workspaceId: string) {
    const { DEMO_SEED_ACTIVE, demoDriftHistory } = await import('./demo-seed');
    if (DEMO_SEED_ACTIVE()) return demoDriftHistory();

    const db = createAdminClient();
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setUTCDate(twelveWeeksAgo.getUTCDate() - 12 * 7);

    const { data, error } = await db
        .from('sentiment_drift_snapshots')
        .select('prompt, platform, week_start, avg_sentiment, sample_size')
        .eq('workspace_id', workspaceId)
        .gte('week_start', isoDate(weekStart(twelveWeeksAgo)))
        .order('week_start', { ascending: true });

    if (error) throw new Error(`History load failed: ${error.message}`);
    return data ?? [];
}
