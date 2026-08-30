import { createAdminClient } from '@/lib/supabase/admin';
import { compareCompatibleMentionMetrics, type ComparableMentionSample } from '@/lib/measurement/metrics';

/**
 * Alert Evaluation Engine
 * 
 * Checks scan results against alert rules and creates notifications
 * when conditions are met. Called after scan batches complete.
 */

type AlertType =
    | 'visibility_drop'
    | 'competitor_overtake'
    | 'zero_visibility'
    | 'new_citation'
    | 'negative_sentiment';

export interface ScanData {
    prompt: string;
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: string | null;
    competitors_mentioned: string[] | null;
    citations: Array<{
        url: string;
        is_own_domain?: boolean;
        provenance?: 'provider_citation' | 'link_mentioned' | 'unverified';
    }> | null;
    platform: string;
    provider_model: string | null;
    measurement_region: string | null;
    measurement_mode: string | null;
    scorer_version: string | null;
    measurement_contract_version: string | null;
    measurement_run_id: string | null;
    created_at: string;
}

// Lazy singleton, instantiating at module load breaks Next 16 page-data
// collection on projects that don't have env vars set yet.
let _supabaseAdmin: ReturnType<typeof createAdminClient> | null = null;
function getSupabaseAdmin() {
    if (_supabaseAdmin) return _supabaseAdmin;
    _supabaseAdmin = createAdminClient();
    return _supabaseAdmin;
}
// Proxy so existing `supabaseAdmin.from(…)` call sites keep working.
const supabaseAdmin = new Proxy({} as ReturnType<typeof createAdminClient>, {
    get(_target, prop) {
        return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
    },
});

/**
 * Check if an alert type is enabled for a workspace
 */
async function loadAlertPreferences(workspaceId: string): Promise<Map<string, boolean>> {
    const { data, error } = await supabaseAdmin
        .from('alert_preferences')
        .select('alert_type, enabled')
        .eq('workspace_id', workspaceId);

    if (error) throw new Error(`Could not read alert preferences: ${error.message}`);
    return new Map((data ?? []).map((preference) => [preference.alert_type, preference.enabled]));
}

/**
 * Create a notification
 */
async function createNotification(
    workspaceId: string,
    type: AlertType,
    title: string,
    message: string,
    dedupeKey: string,
    metadata?: Record<string, unknown>
) {
    const { error } = await supabaseAdmin
        .from('notifications')
        .upsert({
            workspace_id: workspaceId,
            type,
            title,
            message,
            dedupe_key: dedupeKey,
            metadata: metadata || {},
        }, { onConflict: 'workspace_id,dedupe_key', ignoreDuplicates: true });

    if (error) throw new Error(`Failed to create notification [${type}]: ${error.message}`);
}

function comparable(scan: ScanData): ComparableMentionSample {
    return {
        prompt: scan.prompt,
        platform: scan.platform,
        mentioned: scan.brand_mentioned,
        providerModel: scan.provider_model,
        region: scan.measurement_region,
        mode: scan.measurement_mode,
        scorerVersion: scan.scorer_version,
        contractVersion: scan.measurement_contract_version,
    };
}

function compatibilityKey(scan: ScanData): string | null {
    const values = [
        scan.prompt.trim().toLocaleLowerCase(),
        scan.platform.trim().toLocaleLowerCase(),
        scan.provider_model?.trim(),
        scan.measurement_region?.trim(),
        scan.measurement_mode?.trim(),
        scan.scorer_version?.trim(),
        scan.measurement_contract_version?.trim(),
    ];
    return values.some((value) => !value) ? null : values.join('\u0000');
}

/** Keep only the most recent earlier measurement run for each exact cohort. */
export function selectPreviousAlertCohort(currentScans: ScanData[], previousScans: ScanData[]): ScanData[] {
    const currentKeys = new Set(currentScans.map(compatibilityKey).filter((key): key is string => Boolean(key)));
    const selectedRun = new Map<string, string>();
    const selected: ScanData[] = [];
    for (const scan of previousScans) {
        const key = compatibilityKey(scan);
        const runId = scan.measurement_run_id;
        if (!key || !runId || !currentKeys.has(key)) continue;
        const runForKey = selectedRun.get(key);
        if (!runForKey) selectedRun.set(key, runId);
        if ((runForKey ?? runId) === runId) selected.push(scan);
    }
    return selected;
}

export function newOwnCitationUrls(currentScans: ScanData[], previousScans: ScanData[]): string[] {
    const priorUrls = new Set(previousScans.flatMap((scan) =>
        (scan.citations ?? [])
            .filter((citation) => citation.is_own_domain && citation.provenance === 'provider_citation')
            .map((citation) => citation.url),
    ));
    return [...new Set(currentScans.flatMap((scan) =>
        (scan.citations ?? [])
            .filter((citation) => citation.is_own_domain && citation.provenance === 'provider_citation')
            .map((citation) => citation.url),
    ))].filter((url) => !priorUrls.has(url));
}

/**
 * Evaluate scan results and trigger applicable alerts
 */
export async function evaluateAlerts(
    workspaceId: string,
    currentScans: ScanData[],
    previousScans: ScanData[],
    runId: string,
    historicalScans: ScanData[] = previousScans,
): Promise<void> {
    try {
        if (currentScans.length === 0) return;
        const preferences = await loadAlertPreferences(workspaceId);
        const enabled = (type: AlertType) => preferences.get(type) ?? true;
        // 1. Zero visibility check
        const anyMentioned = currentScans.some(s => s.brand_mentioned);
        if (!anyMentioned && enabled('zero_visibility')) {
            await createNotification(
                workspaceId,
                'zero_visibility',
                'Zero Visibility Alert',
                `Your brand was not mentioned in any of the ${currentScans.length} scans just completed.`,
                `measurement:${runId}:zero_visibility`,
                { scanCount: currentScans.length }
            );
        }

        // 2. Negative sentiment spike
        const negativeScans = currentScans.filter(s => s.sentiment === 'negative');
        if (negativeScans.length > 0 && enabled('negative_sentiment')) {
            await createNotification(
                workspaceId,
                'negative_sentiment',
                'Negative Sentiment Detected',
                `${negativeScans.length} scan(s) returned negative sentiment on ${negativeScans.map(s => s.platform).join(', ')}.`,
                `measurement:${runId}:negative_sentiment`,
                { platforms: negativeScans.map(s => s.platform) }
            );
        }

        // 3. Competitor overtake check
        if (enabled('competitor_overtake')) {
            // Check if any competitor is mentioned more than the brand
            const competitorCounts = new Map<string, { name: string; count: number }>();
            currentScans.forEach(s => {
                const seen = new Set<string>();
                (s.competitors_mentioned || []).forEach(rawName => {
                    const name = rawName.trim();
                    const key = name.toLocaleLowerCase();
                    if (!key || seen.has(key)) return;
                    seen.add(key);
                    const current = competitorCounts.get(key);
                    competitorCounts.set(key, { name: current?.name ?? name, count: (current?.count ?? 0) + 1 });
                });
            });

            const brandMentions = currentScans.filter(s => s.brand_mentioned).length;
            for (const { name: competitor, count } of competitorCounts.values()) {
                if (count > brandMentions) {
                    await createNotification(
                        workspaceId,
                        'competitor_overtake',
                        'Competitor Overtake',
                        `${competitor} was mentioned ${count} times vs your brand's ${brandMentions} mentions.`,
                        `measurement:${runId}:competitor_overtake`,
                        { competitor, competitorMentions: count, brandMentions }
                    );
                    break; // One alert per batch
                }
            }
        }

        // 4. Visibility drop (compare with previous)
        if (previousScans.length > 0 && enabled('visibility_drop')) {
            const comparison = compareCompatibleMentionMetrics(
                currentScans.map(comparable),
                previousScans.map(comparable),
            );
            const confidenceQualifiedDrop = comparison.status === 'comparable'
                && comparison.changePoints !== null
                && comparison.changePoints <= -10
                && comparison.current.confidence.interval !== null
                && comparison.previous.confidence.interval !== null
                && comparison.current.confidence.interval.upper < comparison.previous.confidence.interval.lower;

            if (confidenceQualifiedDrop) {
                await createNotification(
                    workspaceId,
                    'visibility_drop',
                    'Visibility Drop Detected',
                    `Your brand mention rate dropped ${Math.abs(comparison.changePoints!)} points compared with the previous compatible measurement.`,
                    `measurement:${runId}:visibility_drop`,
                    {
                        previousRate: comparison.previous.mentionRate,
                        currentRate: comparison.current.mentionRate,
                        changePoints: comparison.changePoints,
                        previousSamples: comparison.previous.samples,
                        currentSamples: comparison.current.samples,
                    }
                );
            }
        }

        // 5. New citation earned
        if (enabled('new_citation')) {
            const ownCitations = newOwnCitationUrls(currentScans, historicalScans);

            if (ownCitations.length > 0) {
                await createNotification(
                    workspaceId,
                    'new_citation',
                    'Your Domain Was Cited',
                    `LLMs cited ${ownCitations.length} page(s) from your domain that were not observed in the prior 30 days: ${ownCitations.slice(0, 3).join(', ')}`,
                    `measurement:${runId}:new_citation`,
                    { citations: ownCitations }
                );
            }
        }
    } catch (err) {
        console.error('Alert evaluation error:', err);
    }
}

/** Evaluate persisted samples so manual, scheduled, and activation runs behave identically. */
export async function evaluateMeasurementAlerts(workspaceId: string, runId: string): Promise<void> {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const fields = 'prompt, brand_mentioned, mention_position, sentiment, competitors_mentioned, citations, platform, provider_model, measurement_region, measurement_mode, scorer_version, measurement_contract_version, measurement_run_id, created_at';
    try {
        const [{ data: current, error: currentError }, { data: previous, error: previousError }] = await Promise.all([
            supabaseAdmin.from('llm_scans').select(fields).eq('workspace_id', workspaceId).eq('measurement_run_id', runId),
            supabaseAdmin.from('llm_scans').select(fields).eq('workspace_id', workspaceId).gte('created_at', since).order('created_at', { ascending: false }),
        ]);
        if (currentError || previousError) {
            throw new Error(`Could not load alert evidence: ${(currentError || previousError)?.message}`);
        }
        const currentScans = (current ?? []) as ScanData[];
        const historicalScans = ((previous ?? []) as ScanData[]).filter((scan) => scan.measurement_run_id !== runId);
        const previousScans = selectPreviousAlertCohort(currentScans, historicalScans);
        await evaluateAlerts(workspaceId, currentScans, previousScans, runId, historicalScans);
    } catch (error) {
        console.error(`[alerts] measurement ${runId} evaluation failed:`, error);
    }
}
