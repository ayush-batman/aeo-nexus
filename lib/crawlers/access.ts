import robotsParser from 'robots-parser';
import { safeFetchText } from '../security/safe-fetch';

// AI crawlers that matter, grouped by the assistant they feed. If these are
// Robots rules are one access signal, not proof of indexing or citations.
// A blocked crawler does not prevent a model from citing another source.
export const AI_CRAWLERS: { bot: string; feeds: string }[] = [
    { bot: 'GPTBot',            feeds: 'ChatGPT (training)' },
    { bot: 'OAI-SearchBot',     feeds: 'ChatGPT Search' },
    { bot: 'ChatGPT-User',      feeds: 'ChatGPT (live fetch)' },
    { bot: 'ClaudeBot',         feeds: 'Claude' },
    { bot: 'PerplexityBot',     feeds: 'Perplexity' },
    { bot: 'Google-Extended',   feeds: 'Gemini training/use controls (not Google Search crawling)' },
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
        const res = await safeFetchText(`${origin}/robots.txt`, {
            headers: { 'User-Agent': 'Aelo-Crawler-Check/1.0' },
            timeoutMs: 8_000,
            maxBytes: 256_000,
        });

        // A missing robots file differs from a blocked or unavailable server.
        if (!res.ok) {
            if (res.status !== 404 && res.status !== 410) return empty;
            return {
                ok: true, robotsFound: false, blockedCount: 0,
                results: AI_CRAWLERS.map((c) => ({ ...c, allowed: true })),
            };
        }

        const txt = res.text;
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
