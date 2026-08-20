import { createAdminClient } from '@/lib/supabase/admin';

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
};

type ScanRow = {
    platform: string;
    prompt: string;
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: string | null;
    competitors_mentioned: string[] | null;
    created_at: string;
};

const PRIORITY_RANK: Record<InsightPriority, number> = { high: 0, medium: 1, low: 2 };

function slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export async function generateInsights(workspaceId: string): Promise<Insight[]> {
    const db = createAdminClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data, error } = await db
        .from('llm_scans')
        .select('platform, prompt, brand_mentioned, mention_position, sentiment, competitors_mentioned, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return [];

    // Keep the newest row per (prompt, platform).
    const latest = new Map<string, ScanRow>();
    for (const r of data as ScanRow[]) {
        const k = `${r.prompt}||${r.platform}`;
        if (!latest.has(k)) latest.set(k, r);
    }

    // Aggregate per prompt.
    type Agg = { prompt: string; tested: number; mentioned: number; positions: number[]; negatives: number; competitors: Set<string> };
    const byPrompt = new Map<string, Agg>();
    for (const r of latest.values()) {
        const a = byPrompt.get(r.prompt) ?? { prompt: r.prompt, tested: 0, mentioned: 0, positions: [], negatives: 0, competitors: new Set<string>() };
        a.tested++;
        if (r.brand_mentioned) a.mentioned++;
        if (r.mention_position != null) a.positions.push(r.mention_position);
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
                    title: `${rival} owns "${short}"`,
                    detail: `AI named ${rival} but never you for this query in the last 30 days. This is a lost recommendation on a question your buyers ask.`,
                    actionLabel: 'Plan content', actionHref: '/dashboard/content-studio',
                });
            } else {
                insights.push({
                    id: `vis-${slug(a.prompt)}`, category: 'visibility', priority: 'high',
                    title: `Invisible for "${short}"`,
                    detail: `No AI engine named you for this query in the last 30 days. Nothing you publish is being surfaced here yet.`,
                    actionLabel: 'Plan content', actionHref: '/dashboard/content-studio',
                });
            }
        } else if (rate < 0.5) {
            insights.push({
                id: `vis-weak-${slug(a.prompt)}`, category: 'visibility', priority: 'medium',
                title: `Weak coverage on "${short}"`,
                detail: `You appear in only ${Math.round(rate * 100)}% of AI answers for this query. Reinforce the sources that already mention you.`,
                actionLabel: 'Find sources', actionHref: '/dashboard/forum-hub',
            });
        } else if (avgPos != null && avgPos > 3) {
            insights.push({
                id: `pos-${slug(a.prompt)}`, category: 'visibility', priority: 'low',
                title: `Ranked low on "${short}"`,
                detail: `You are mentioned but at average position ${avgPos.toFixed(1)}. Moving up means more third-party corroboration.`,
                actionLabel: 'Find sources', actionHref: '/dashboard/forum-hub',
            });
        }

        if (a.negatives > 0) {
            insights.push({
                id: `sent-${slug(a.prompt)}`, category: 'sentiment', priority: 'high',
                title: `Negative tone on "${short}"`,
                detail: `At least one engine framed you negatively for this query. Address the perception directly in your own content.`,
                actionLabel: 'Draft response', actionHref: '/dashboard/content-studio',
            });
        }
    }

    // A standing technical insight so the board is never empty when scans exist.
    insights.push({
        id: 'audit-crawl-access', category: 'audit', priority: 'medium',
        title: 'Confirm AI crawlers can reach you',
        detail: 'If GPTBot, ClaudeBot or PerplexityBot are blocked in robots.txt, you cannot be cited no matter what you publish. Run the technical audit to check.',
        actionLabel: 'Run audit', actionHref: '/dashboard/audit',
    });

    insights.sort((x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority]);
    return insights.slice(0, 18);
}
