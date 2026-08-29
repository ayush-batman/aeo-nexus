import type { createAdminClient } from '@/lib/supabase/admin';
import { MEASUREMENT_CONTRACT_VERSION } from '@/lib/measurement/types';
import type { ComparableSnapshot } from '@/lib/measurement/comparison';

// Shape stored in interventions.baseline_snapshot / impact_snapshot (JSONB).
//   { "<prompt>": { "<platform>": { mentioned, position, sentiment } } }
export type VisibilitySnapshot = ComparableSnapshot;

const SNAPSHOT_SAMPLES_PER_ENGINE = 8;

function mode(values: string[]): string | null {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * Snapshot the CURRENT visibility for a set of prompts in a workspace by
 * looking at up to eight recent `llm_scans` rows per (prompt, platform) in
 * the last 30 days. This is the "before" cohort for an intervention receipt.
 *
 * Denormalizing at snapshot time means the "before" survives scan pruning.
 */
export async function snapshotVisibility(
    db: ReturnType<typeof createAdminClient>,
    workspaceId: string,
    prompts: string[],
): Promise<VisibilitySnapshot> {
    if (prompts.length === 0) return {};

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: scans, error } = await db
        .from('llm_scans')
        .select('platform, prompt, brand_mentioned, mention_position, sentiment, created_at')
        .eq('workspace_id', workspaceId)
        .in('prompt', prompts)
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false });

    if (error || !scans) {
        console.warn('[interventions/snapshot] no scans found:', error);
        // Return empty buckets per prompt so callers get a consistent shape
        return Object.fromEntries(prompts.map(p => [p, {}])) as VisibilitySnapshot;
    }

    const grouped = new Map<string, typeof scans>();
    for (const scan of scans) {
        const key = `${scan.prompt}\u0000${scan.platform}`;
        const rows = grouped.get(key) ?? [];
        if (rows.length < SNAPSHOT_SAMPLES_PER_ENGINE) rows.push(scan);
        grouped.set(key, rows);
    }

    const out: VisibilitySnapshot = {};
    for (const prompt of prompts) out[prompt] = {};
    for (const rows of grouped.values()) {
        const first = rows[0];
        if (!first) continue;
        const mentions = rows.filter((row) => row.brand_mentioned).length;
        const positions = rows.flatMap((row) => typeof row.mention_position === 'number' ? [row.mention_position] : []);
        const sentiments = rows.flatMap((row) => typeof row.sentiment === 'string' ? [row.sentiment] : []);
        const bucket = out[first.prompt] ?? (out[first.prompt] = {});
        bucket[first.platform] = {
            mentioned: mentions / rows.length >= 0.5,
            position: positions.length > 0
                ? Math.round((positions.reduce((sum, value) => sum + value, 0) / positions.length) * 10) / 10
                : null,
            sentiment: mode(sentiments),
            sample_count: rows.length,
            mention_count: mentions,
            mention_rate: Math.round((mentions / rows.length) * 10_000) / 10_000,
            position_sample_count: positions.length,
            measured_at: first.created_at,
            contract_version: MEASUREMENT_CONTRACT_VERSION,
        };
    }
    return out;
}
