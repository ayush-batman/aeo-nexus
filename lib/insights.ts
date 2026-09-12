import { readScanPages } from '@/lib/data-access';
import { buildInsights, type Insight } from '@/lib/measurement/insights';
export type { Insight, InsightCategory, InsightPriority } from '@/lib/measurement/insights';

// Auto-generated recommendations ("what should I do"), derived from the last
// 30 days of scans. Distinct from `interventions`, which log what you already
// did. An insight, once acted on, becomes an intervention (the proof loop).

export async function generateInsights(workspaceId: string): Promise<Insight[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    return buildInsights(await readScanPages(workspaceId, { since: cutoff.getTime() }));
}
