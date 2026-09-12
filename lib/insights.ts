import { readScanPages } from '@/lib/data-access';

// Auto-generated recommendations ("what should I do"), derived from the last
// 30 days of scans. Distinct from `interventions`, which log what you already
// did. An insight, once acted on, becomes an intervention (the proof loop).

export type InsightCategory = 'visibility' | 'narrative' | 'sentiment' | 'audit' | 'citation';
export type InsightPriority = 'high' | 'medium' | 'low';

export type Insight = {
    id: string;               // stable slug so client lane state survives refresh
    category: InsightCategory;
    priority: InsightPriority;
    title: string;
    detail: string;
    actionLabel: string;
    actionHref: string;
    targetPrompt?: string;
};

const PRIORITY_RANK: Record<InsightPriority, number> = { high: 0, medium: 1, low: 2 };

function slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export async function generateInsights(workspaceId: string): Promise<Insight[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const data = (await readScanPages(workspaceId, { since: cutoff.getTime() }))
        .filter(scan => !scan.failure_code && Boolean(scan.response.trim()));
    if (!data.length) return [];

    // Aggregate per prompt.
    type Agg = { prompt: string; tested: number; mentioned: number; positions: number[]; negatives: number; competitors: Set<string> };
    const byPrompt = new Map<string, Agg>();
    for (const r of data) {
        const a = byPrompt.get(r.prompt) ?? { prompt: r.prompt, tested: 0, mentioned: 0, positions: [], negatives: 0, competitors: new Set<string>() };
        a.tested++;
        if (r.brand_mentioned) a.mentioned++;
        if (r.brand_mentioned && r.mention_position != null && r.mention_position > 0) a.positions.push(r.mention_position);
        if ((r.sentiment ?? '').toLowerCase() === 'negative') a.negatives++;
        for (const c of r.competitors_mentioned ?? []) if (c) a.competitors.add(c);
        byPrompt.set(r.prompt, a);
    }

    const insights: Insight[] = [];
    for (const a of byPrompt.values()) {
        const rate = a.tested ? a.mentioned / a.tested : 0;
        const avgPos = a.positions.length ? a.positions.reduce((s, x) => s + x, 0) / a.positions.length : null;
        const short = a.prompt.length > 54 ? a.prompt.slice(0, 51) + '…' : a.prompt;

        if (rate === 0) {
            const rival = [...a.competitors][0];
            if (rival) {
                insights.push({
                    id: `narr-${slug(a.prompt)}`, category: 'narrative', priority: 'high',
                    title: `${rival} appeared where you were absent`,
                    detail: `Across ${a.tested} successful samples for "${short}" in the last 30 days, your brand had no mentions and ${rival} appeared at least once. Retest before treating this as a stable gap.`,
                    actionLabel: 'Plan content', actionHref: '/dashboard/content-studio',
                    targetPrompt: a.prompt,
                });
            } else {
                insights.push({
                    id: `vis-${slug(a.prompt)}`, category: 'visibility', priority: 'high',
                    title: `No observed mentions for "${short}"`,
                    detail: `Your brand was absent from ${a.tested} successful samples in the last 30 days. This describes these samples, not every AI answer. Retest before choosing content work.`,
                    actionLabel: 'Plan content', actionHref: '/dashboard/content-studio',
                    targetPrompt: a.prompt,
                });
            }
        } else if (rate < 0.5) {
            insights.push({
                id: `vis-weak-${slug(a.prompt)}`, category: 'visibility', priority: 'medium',
                title: `Weak coverage on "${short}"`,
                detail: `You appeared in ${a.mentioned} of ${a.tested} successful samples (${Math.round(rate * 100)}%). Review the cited sources and repeat the same measurement before acting.`,
                actionLabel: 'Find sources', actionHref: '/dashboard/forum-hub',
                targetPrompt: a.prompt,
            });
        } else if (avgPos != null && avgPos > 3) {
            insights.push({
                id: `pos-${slug(a.prompt)}`, category: 'visibility', priority: 'low',
                title: `Ranked low on "${short}"`,
                detail: `You are mentioned but at average position ${avgPos.toFixed(1)}. Moving up means more third-party corroboration.`,
                actionLabel: 'Find sources', actionHref: '/dashboard/forum-hub',
                targetPrompt: a.prompt,
            });
        }

        if (a.negatives > 0) {
            insights.push({
                id: `sent-${slug(a.prompt)}`, category: 'sentiment', priority: 'high',
                title: `Negative tone on "${short}"`,
                detail: `At least one engine framed you negatively for this query. Address the perception directly in your own content.`,
                actionLabel: 'Draft response', actionHref: '/dashboard/content-studio',
                targetPrompt: a.prompt,
            });
        }
    }

    // A standing technical insight so the board is never empty when scans exist.
    insights.push({
        id: 'audit-crawl-access', category: 'audit', priority: 'medium',
        title: 'Confirm AI crawlers can reach you',
        detail: 'Check access rules for the relevant search and crawler agents. A robots.txt rule alone does not prove whether an AI assistant can cite you.',
        actionLabel: 'Run audit', actionHref: '/dashboard/audit',
    });

    insights.sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority]);
    return insights.slice(0, 18);
}
