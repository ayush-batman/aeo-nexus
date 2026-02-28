/**
 * Google Custom Search API Client
 * 
 * Searches across Reddit, Quora, Stack Overflow, HN threads via site: operators.
 * Requires: GEMINI_API_KEY (same Google Cloud project) + GOOGLE_CSE_ID
 */

export interface GoogleSearchResult {
    title: string;
    link: string;
    snippet: string;
    displayLink: string; // e.g., "www.reddit.com", "stackoverflow.com"
    platform: string;    // normalized: "reddit", "quora", "stackoverflow", etc.
    formattedUrl: string;
}

interface SearchResponse {
    results: GoogleSearchResult[];
    totalResults: number;
}

const FORUM_SITES = [
    'reddit.com',
    'quora.com',
    'stackoverflow.com',
    'stackexchange.com',
    'news.ycombinator.com',
];

/**
 * Detect platform from URL
 */
function detectPlatform(url: string): string {
    const u = url.toLowerCase();
    if (u.includes('reddit.com')) return 'reddit';
    if (u.includes('quora.com')) return 'quora';
    if (u.includes('stackoverflow.com') || u.includes('stackexchange.com')) return 'stackoverflow';
    if (u.includes('ycombinator.com') || u.includes('news.ycombinator')) return 'hackernews';
    return 'web';
}

/**
 * Extract subreddit from Reddit URL
 */
function extractSubreddit(url: string): string | null {
    const match = url.match(/reddit\.com\/r\/([^/]+)/);
    return match ? match[1] : null;
}

/**
 * Search forums via Google Custom Search API
 */
export async function searchForums(
    query: string,
    options: {
        sites?: string[];
        limit?: number;
        startIndex?: number;
    } = {}
): Promise<SearchResponse> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;

    if (!apiKey || !cseId) {
        console.warn('Google Search not configured: need GEMINI_API_KEY + GOOGLE_CSE_ID');
        return { results: [], totalResults: 0 };
    }

    const { sites = FORUM_SITES, limit = 10, startIndex = 1 } = options;

    // Build site: query
    const siteQuery = sites.map(s => `site:${s}`).join(' OR ');
    const fullQuery = `${query} (${siteQuery})`;

    const params = new URLSearchParams({
        key: apiKey,
        cx: cseId,
        q: fullQuery,
        num: Math.min(limit, 10).toString(), // Google CSE max is 10 per request
        start: startIndex.toString(),
    });

    try {
        const response = await fetch(
            `https://www.googleapis.com/customsearch/v1?${params}`
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Google Search API error:', error.error?.message || response.statusText);
            return { results: [], totalResults: 0 };
        }

        const data = await response.json();

        const results: GoogleSearchResult[] = (data.items || []).map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet || '',
            displayLink: item.displayLink,
            platform: detectPlatform(item.link),
            formattedUrl: item.formattedUrl,
        }));

        return {
            results,
            totalResults: parseInt(data.searchInformation?.totalResults || '0'),
        };
    } catch (error) {
        console.error('Google Search fetch error:', error);
        return { results: [], totalResults: 0 };
    }
}

/**
 * Calculate opportunity score for a Google Search result
 */
export function calculateSearchOpportunityScore(
    result: GoogleSearchResult,
    keywords: string[] = []
): number {
    let score = 30; // Base score — it showed up in Google, so it's relevant

    const text = `${result.title} ${result.snippet}`.toLowerCase();

    // Platform weight (higher AEO signal)
    switch (result.platform) {
        case 'reddit': score += 15; break;
        case 'stackoverflow': score += 15; break;
        case 'quora': score += 10; break;
        case 'hackernews': score += 10; break;
        default: score += 5;
    }

    // Keyword matches (max 25)
    let keywordBonus = 0;
    for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
            keywordBonus += 5;
        }
    }
    score += Math.min(25, keywordBonus);

    // Buying/recommendation intent (max 20)
    const buyingIntents = ['recommend', 'best', 'should i', 'worth it', 'looking for', 'help me choose', 'suggestions', 'alternative'];
    const compareIntents = ['vs', 'versus', 'compared to', 'difference between'];

    const hasBuyingIntent = buyingIntents.some(i => text.includes(i));
    const hasCompareIntent = compareIntents.some(i => text.includes(i));

    if (hasBuyingIntent) score += 20;
    else if (hasCompareIntent) score += 15;

    // Question-format bonus (people asking = opportunity)
    if (result.title.includes('?') || text.includes('how to') || text.includes('what is')) {
        score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Convert Google Search results to forum thread format
 */
export function convertToThreadFormat(results: GoogleSearchResult[], keywords: string[] = []) {
    return results.map(result => ({
        platform: result.platform,
        external_id: Buffer.from(result.link).toString('base64').slice(0, 64),
        title: result.title,
        url: result.link,
        subreddit: result.platform === 'reddit' ? extractSubreddit(result.link) : result.displayLink,
        author: null,
        score: 0,
        num_comments: 0,
        opportunity_score: calculateSearchOpportunityScore(result, keywords),
        created_at: new Date().toISOString(), // Google doesn't give exact dates
    }));
}

/**
 * Check if Google Custom Search is configured
 */
export function isGoogleSearchConfigured(): boolean {
    return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) && !!process.env.GOOGLE_CSE_ID;
}
