import robotsParser from 'robots-parser';
import { createAdminClient } from '@/lib/supabase/admin';

// AI crawlers that matter, grouped by the assistant they feed. If these are
// blocked in robots.txt, the brand cannot be cited there no matter what it
// publishes. This is the "can AI even reach you" half of the crawler view.
export const AI_CRAWLERS: { bot: string; feeds: string }[] = [
    { bot: 'GPTBot',            feeds: 'ChatGPT (training)' },
    { bot: 'OAI-SearchBot',     feeds: 'ChatGPT Search' },
    { bot: 'ChatGPT-User',      feeds: 'ChatGPT (live fetch)' },
    { bot: 'ClaudeBot',         feeds: 'Claude' },
    { bot: 'PerplexityBot',     feeds: 'Perplexity' },
    { bot: 'Google-Extended',   feeds: 'Gemini / AI Overviews' },
    { bot: 'CCBot',             feeds: 'Common Crawl (many models)' },
    { bot: 'Amazonbot',         feeds: 'Alexa / Rufus' },
    { bot: 'Applebot-Extended', feeds: 'Apple Intelligence' },
    { bot: 'Bytespider',        feeds: 'Doubao / TikTok' },
];

export type CrawlerAccess = {
    ok: boolean;                                    // false = could not fetch robots.txt
    robotsFound: boolean;
    results: { bot: string; feeds: string; allowed: boolean }[];
    blockedCount: number;
};

function normalizeDomain(website?: string | null): string | null {
    if (!website) return null;
    let d = website.trim();
    if (!/^https?:\/\//i.test(d)) d = `https://${d}`;
    try { return new URL(d).origin; } catch { return null; }
}

export async function checkCrawlerAccess(website?: string | null): Promise<CrawlerAccess> {
    const origin = normalizeDomain(website);
    const empty: CrawlerAccess = { ok: false, robotsFound: false, results: [], blockedCount: 0 };
    if (!origin) return empty;

    try {
        const res = await fetch(`${origin}/robots.txt`, {
            headers: { 'User-Agent': 'Aelo-Crawler-Check/1.0' },
            signal: AbortSignal.timeout(8000),
        });

        // No robots.txt (or error status) means nothing is disallowed: all allowed.
        if (!res.ok) {
            return {
                ok: true, robotsFound: false, blockedCount: 0,
                results: AI_CRAWLERS.map((c) => ({ ...c, allowed: true })),
            };
        }

        const txt = await res.text();
        const robots = robotsParser(`${origin}/robots.txt`, txt);
        const probe = `${origin}/`;
        let blocked = 0;
        const results = AI_CRAWLERS.map((c) => {
            // robots-parser returns false when explicitly disallowed; undefined = allowed.
            const allowed = robots.isAllowed(probe, c.bot) !== false;
            if (!allowed) blocked++;
            return { ...c, allowed };
        });
        return { ok: true, robotsFound: true, results, blockedCount: blocked };
    } catch {
        return empty;
    }
}

export type AiTraffic = {
    total: number;
    sources: { source: string; count: number }[];
    hasPixelData: boolean;
};

// Aggregate AI referral visits captured by the pixel (analytics_events.ai_source)
// over the trailing `days`. This is the "AI is sending you traffic" half.
export async function getAiReferralTraffic(workspaceId: string, days = 30): Promise<AiTraffic> {
    const db = createAdminClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data, error } = await db
        .from('analytics_events')
        .select('ai_source')
        .eq('workspace_id', workspaceId)
        .not('ai_source', 'is', null)
        .gte('created_at', cutoff.toISOString());

    if (error || !data) return { total: 0, sources: [], hasPixelData: false };

    const counts = new Map<string, number>();
    for (const r of data as { ai_source: string }[]) {
        counts.set(r.ai_source, (counts.get(r.ai_source) ?? 0) + 1);
    }
    const sources = [...counts.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
    return { total: data.length, sources, hasPixelData: data.length > 0 };
}
