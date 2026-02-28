/**
 * Hacker News API Client (Algolia Search)
 * 
 * Completely free, no auth, no rate limits (reasonable usage).
 * Uses hn.algolia.com/api/v1 for full-text search.
 * 
 * AEO Relevance: HN is in Common Crawl dataset, heavily cited by AI for tech/startup topics.
 */

export interface HNStory {
    objectID: string;
    title: string;
    url: string | null;
    author: string;
    points: number;
    num_comments: number;
    created_at: string;      // ISO date
    created_at_i: number;    // unix timestamp
    story_text: string | null;
    _tags: string[];
}

interface HNSearchResponse {
    hits: HNStory[];
    nbHits: number;
    page: number;
    nbPages: number;
    hitsPerPage: number;
}

/**
 * Search Hacker News stories
 */
export async function searchHN(
    query: string,
    options: {
        tags?: string;       // 'story', 'comment', 'ask_hn', 'show_hn'
        numericFilters?: string; // e.g., 'points>10,num_comments>5'
        hitsPerPage?: number;
        page?: number;
        sortByDate?: boolean;
    } = {}
): Promise<{ stories: HNStory[]; totalHits: number }> {
    const {
        tags = 'story',
        numericFilters,
        hitsPerPage = 20,
        page = 0,
        sortByDate = false,
    } = options;

    const endpoint = sortByDate ? 'search_by_date' : 'search';

    const params = new URLSearchParams({
        query,
        tags,
        hitsPerPage: hitsPerPage.toString(),
        page: page.toString(),
    });

    if (numericFilters) {
        params.set('numericFilters', numericFilters);
    }

    try {
        const response = await fetch(
            `https://hn.algolia.com/api/v1/${endpoint}?${params}`
        );

        if (!response.ok) {
            console.error(`HN API error: ${response.status} ${response.statusText}`);
            return { stories: [], totalHits: 0 };
        }

        const data: HNSearchResponse = await response.json();

        return {
            stories: data.hits,
            totalHits: data.nbHits,
        };
    } catch (error) {
        console.error('HN search error:', error);
        return { stories: [], totalHits: 0 };
    }
}

/**
 * Search "Ask HN" posts (best for brand recommendation opportunities)
 */
export async function searchAskHN(
    query: string,
    options: { hitsPerPage?: number; page?: number } = {}
): Promise<HNStory[]> {
    const { stories } = await searchHN(query, {
        ...options,
        tags: 'ask_hn',
    });
    return stories;
}

/**
 * Search "Show HN" posts (good for competitive intelligence)
 */
export async function searchShowHN(
    query: string,
    options: { hitsPerPage?: number; page?: number } = {}
): Promise<HNStory[]> {
    const { stories } = await searchHN(query, {
        ...options,
        tags: 'show_hn',
    });
    return stories;
}

/**
 * Calculate opportunity score for a Hacker News story
 */
export function calculateHNOpportunityScore(
    story: HNStory,
    keywords: string[] = []
): number {
    let score = 0;
    const now = Date.now() / 1000;
    const ageHours = (now - story.created_at_i) / 3600;

    // Points = community signal (max 25)
    if (story.points > 100) score += 25;
    else if (story.points > 30) score += 20;
    else if (story.points > 10) score += 15;
    else score += 5;

    // Comments = discussion depth (max 20)
    if (story.num_comments > 50) score += 20;
    else if (story.num_comments > 20) score += 15;
    else if (story.num_comments > 5) score += 10;
    else score += 5;

    // Recency bonus (max 20)
    if (ageHours < 24) score += 20;
    else if (ageHours < 72) score += 15;
    else if (ageHours < 168) score += 10;
    else if (ageHours < 720) score += 5;

    // Keyword match (max 20)
    const text = `${story.title} ${story.story_text || ''}`.toLowerCase();
    let keywordBonus = 0;
    for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
            keywordBonus += 5;
        }
    }
    score += Math.min(20, keywordBonus);

    // Ask HN / Show HN bonus (better engagement potential)
    if (story._tags?.includes('ask_hn')) score += 15;
    else if (story._tags?.includes('show_hn')) score += 10;

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Convert HN stories to forum thread format
 */
export function convertHNToThreadFormat(stories: HNStory[], keywords: string[] = []) {
    return stories.map(story => ({
        platform: 'hackernews',
        external_id: `hn_${story.objectID}`,
        title: story.title,
        url: story.url || `https://news.ycombinator.com/item?id=${story.objectID}`,
        subreddit: story._tags?.includes('ask_hn') ? 'Ask HN'
            : story._tags?.includes('show_hn') ? 'Show HN'
                : 'Hacker News',
        author: story.author,
        score: story.points,
        num_comments: story.num_comments,
        opportunity_score: calculateHNOpportunityScore(story, keywords),
        created_at: story.created_at,
    }));
}
