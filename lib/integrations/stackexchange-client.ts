/**
 * Stack Exchange API Client (v2.3)
 * 
 * Free, no auth required for basic usage (300 requests/day without key, 10,000/day with key).
 * Covers Stack Overflow, Server Fault, Super User, and 170+ sites.
 * 
 * AEO Relevance: Google partnered with SO (Overflow API) — SO content feeds directly into Gemini.
 * ChatGPT and Perplexity also heavily cite SO via Common Crawl.
 */

export interface StackExchangeQuestion {
    question_id: number;
    title: string;
    link: string;
    tags: string[];
    score: number;          // upvotes minus downvotes
    answer_count: number;
    view_count: number;
    is_answered: boolean;
    creation_date: number;  // unix timestamp
    owner: {
        display_name: string;
        link?: string;
    };
    body_markdown?: string;
}

interface SESearchResponse {
    items: StackExchangeQuestion[];
    has_more: boolean;
    quota_remaining: number;
}

/**
 * Search Stack Exchange for questions
 */
export async function searchStackExchange(
    query: string,
    options: {
        site?: string;        // 'stackoverflow', 'serverfault', 'superuser', etc.
        tagged?: string[];    // filter by tags
        sort?: 'activity' | 'votes' | 'creation' | 'relevance';
        order?: 'asc' | 'desc';
        pageSize?: number;
        page?: number;
        accepted?: boolean;   // only questions with accepted answers
        minViews?: number;
    } = {}
): Promise<{ questions: StackExchangeQuestion[]; hasMore: boolean; quotaRemaining: number }> {
    const {
        site = 'stackoverflow',
        tagged = [],
        sort = 'relevance',
        order = 'desc',
        pageSize = 20,
        page = 1,
        accepted,
        minViews,
    } = options;

    const params = new URLSearchParams({
        order,
        sort,
        q: query,
        site,
        pagesize: pageSize.toString(),
        page: page.toString(),
        filter: 'withbody', // include body for better context
    });

    if (tagged.length > 0) {
        params.set('tagged', tagged.join(';'));
    }
    if (accepted !== undefined) {
        params.set('accepted', accepted.toString());
    }

    try {
        const response = await fetch(
            `https://api.stackexchange.com/2.3/search/advanced?${params}`,
            { headers: { 'Accept-Encoding': 'gzip' } } // SE API requires this
        );

        if (!response.ok) {
            console.error(`Stack Exchange API error: ${response.status} ${response.statusText}`);
            return { questions: [], hasMore: false, quotaRemaining: 0 };
        }

        const data: SESearchResponse = await response.json();

        // Filter by min views if specified
        let questions = data.items || [];
        if (minViews) {
            questions = questions.filter(q => q.view_count >= minViews);
        }

        return {
            questions,
            hasMore: data.has_more,
            quotaRemaining: data.quota_remaining,
        };
    } catch (error) {
        console.error('Stack Exchange search error:', error);
        return { questions: [], hasMore: false, quotaRemaining: 0 };
    }
}

/**
 * Get unanswered questions (best opportunity for brand insertion)
 */
export async function getUnansweredQuestions(
    query: string,
    options: {
        site?: string;
        tagged?: string[];
        pageSize?: number;
    } = {}
): Promise<StackExchangeQuestion[]> {
    const { site = 'stackoverflow', tagged = [], pageSize = 15 } = options;

    const params = new URLSearchParams({
        order: 'desc',
        sort: 'activity',
        q: query,
        site,
        pagesize: pageSize.toString(),
        filter: 'withbody',
    });

    if (tagged.length > 0) {
        params.set('tagged', tagged.join(';'));
    }

    try {
        const response = await fetch(
            `https://api.stackexchange.com/2.3/search/advanced?${params}&accepted=False&answers=0`,
            { headers: { 'Accept-Encoding': 'gzip' } }
        );

        if (!response.ok) return [];

        const data: SESearchResponse = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Stack Exchange unanswered search error:', error);
        return [];
    }
}

/**
 * Calculate opportunity score for a Stack Exchange question
 */
export function calculateSOOpportunityScore(
    question: StackExchangeQuestion,
    keywords: string[] = []
): number {
    let score = 0;
    const now = Date.now() / 1000;
    const ageHours = (now - question.creation_date) / 3600;

    // View count = reach (max 25)
    if (question.view_count > 10000) score += 25;
    else if (question.view_count > 1000) score += 20;
    else if (question.view_count > 100) score += 15;
    else score += 5;

    // Vote score = authority signal (max 15)
    score += Math.min(15, question.score * 2);

    // Unanswered or low-answer = opportunity (max 20)
    if (!question.is_answered && question.answer_count === 0) score += 20;
    else if (!question.is_answered) score += 15;
    else if (question.answer_count < 3) score += 10;

    // Recency bonus (max 20)
    if (ageHours < 24) score += 20;
    else if (ageHours < 72) score += 15;
    else if (ageHours < 168) score += 10;
    else if (ageHours < 720) score += 5;

    // Keyword match in title (max 20)
    const title = question.title.toLowerCase();
    let keywordBonus = 0;
    for (const keyword of keywords) {
        if (title.includes(keyword.toLowerCase())) {
            keywordBonus += 5;
        }
    }
    score += Math.min(20, keywordBonus);

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Convert Stack Exchange questions to forum thread format
 */
export function convertSOToThreadFormat(questions: StackExchangeQuestion[], keywords: string[] = []) {
    return questions.map(q => ({
        platform: 'stackoverflow',
        external_id: `so_${q.question_id}`,
        title: q.title,
        url: q.link,
        subreddit: q.tags.slice(0, 3).join(', '), // show top tags in the subreddit field
        author: q.owner?.display_name || null,
        score: q.score,
        num_comments: q.answer_count,
        opportunity_score: calculateSOOpportunityScore(q, keywords),
        created_at: new Date(q.creation_date * 1000).toISOString(),
    }));
}
