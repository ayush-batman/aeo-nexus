import type { createAdminClient } from '@/lib/supabase/admin';

// Shape stored in interventions.baseline_snapshot / impact_snapshot (JSONB).
//   { "<prompt>": { "<platform>": { mentioned, position, sentiment } } }
export type VisibilitySnapshot = Record<
    string,
    Record<string, { mentioned: boolean; position: number | null; sentiment: string | null }>
>;

/**
 * Snapshot the CURRENT visibility for a set of prompts in a workspace by
 * looking at the most-recent `llm_scans` row per (prompt, platform) in the
 * last 30 days. This is the "before" number for an intervention receipt.
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

    const out: VisibilitySnapshot = {};
    for (const prompt of prompts) out[prompt] = {};
    // Results are DESC — keep only the newest per (prompt, platform)
    for (const s of scans) {
        const bucket = out[s.prompt] ?? (out[s.prompt] = {});
        if (bucket[s.platform]) continue;
        bucket[s.platform] = {
            mentioned: !!s.brand_mentioned,
            position: s.mention_position,
            sentiment: s.sentiment,
        };
    }
    return out;
}
