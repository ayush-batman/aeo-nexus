/**
 * Reddit API Client
 * 
 * Requires environment variables:
 * - REDDIT_CLIENT_ID
 * - REDDIT_CLIENT_SECRET
 * - REDDIT_USER_AGENT (e.g., "AEONexus/1.0")
 */

interface RedditAuthToken {
    accessToken: string;
    expiresAt: number;
}

interface RedditPost {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    subreddit: string;
    score: number;
    numComments: number;
    createdUtc: number;
    author: string;
    isLocked: boolean;
    over18: boolean;
}

interface RedditSearchResult {
    posts: RedditPost[];
    after: string | null;
}

// Token cache
let tokenCache: RedditAuthToken | null = null;

/**
 * Get Reddit OAuth token (application-only auth)
 * Returns null if credentials are not configured
 */
async function getAccessToken(): Promise<string | null> {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const userAgent = process.env.REDDIT_USER_AGENT || 'AEONexus/1.0';

    if (!clientId || !clientSecret) {
        return null; // Fallback to public API
    }

    // Return cached token if still valid
    if (tokenCache && Date.now() < tokenCache.expiresAt) {
        return tokenCache.accessToken;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': userAgent,
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            console.warn(`Reddit auth failed: ${response.statusText}. Falling back to public API.`);
            return null;
        }

        const data = await response.json();

        // Cache the token (expires in ~1 hour, refresh 5 min early)
        tokenCache = {
            accessToken: data.access_token,
            expiresAt: Date.now() + (data.expires_in - 300) * 1000,
        };

        return tokenCache.accessToken;
    } catch (error) {
        console.warn('Error fetching Reddit token:', error);
        return null;
    }
}

/**
 * Make Reddit API request (Authenticated or Public Fallback)
 */
async function redditRequest(endpoint: string): Promise<unknown> {
    const token = await getAccessToken();
    const userAgent = process.env.REDDIT_USER_AGENT || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const baseUrl = token ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
    const headers: Record<string, string> = {
        'User-Agent': userAgent,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
        headers,
    });

    if (!response.ok) {
        // Handle specific errors slightly better
        if (response.status === 429) {
            throw new Error('Reddit API Rate Limited. Please try again later.');
        }
        throw new Error(`Reddit API error (${response.status}): ${response.statusText}`);
    }

    return response.json();
}

/**
 * Transform Reddit API post data to our format
 */
function transformPost(post: { data: Record<string, unknown> }): RedditPost {
    const d = post.data;
    return {
        id: d.id as string,
        title: d.title as string,
        selftext: (d.selftext as string) || '',
        url: `https://reddit.com${d.permalink}`,
        permalink: d.permalink as string,
        subreddit: d.subreddit as string,
        score: d.score as number,
        numComments: d.num_comments as number,
        createdUtc: d.created_utc as number,
        author: d.author as string,
        isLocked: d.locked as boolean,
        over18: d.over_18 as boolean,
    };
}

export async function searchReddit(
    query: string,
    options: {
        subreddits?: string[];
        sort?: 'relevance' | 'hot' | 'new' | 'top';
        time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
        limit?: number;
        after?: string;
    } = {}
): Promise<RedditSearchResult> {
    const { subreddits = [], sort = 'relevance', time = 'year', limit = 25, after } = options;

    let endpoint = '/search.json';
    let combinedSubreddits = subreddits.join('+');

    // If specific subreddits, use subreddit search
    if (combinedSubreddits.length > 0) {
        endpoint = `/r/${combinedSubreddits}/search.json`;
    }

    const params = new URLSearchParams({
        q: query,
        sort,
        t: time,
        limit: limit.toString(),
        restrict_sr: combinedSubreddits.length > 0 ? 'true' : 'false',
        type: 'link',
    });

    if (after) {
        params.set('after', after);
    }

    try {
        const data = await redditRequest(`${endpoint}?${params}`) as {
            data: { children: { data: Record<string, unknown> }[]; after: string | null };
        };

        let posts = data.data.children.map(transformPost);

        // dylect-bot strategy: If targeted subreddits return very few, also search globally
        if (combinedSubreddits.length > 0 && posts.length < limit / 2) {
            console.log(`Targeted search yielded few results (${posts.length}). Falling back to global search.`);
            const globalParams = new URLSearchParams({
                q: query,
                sort,
                t: time,
                limit: Math.min(10, limit).toString(),
                type: 'link',
            });
            try {
                const globalData = await redditRequest(`/search.json?${globalParams}`) as {
                    data: { children: { data: Record<string, unknown> }[] };
                };
                const globalPosts = globalData.data.children.map(transformPost);

                // Merge and deduplicate
                const seen = new Set(posts.map(p => p.id));
                for (const p of globalPosts) {
                    if (!seen.has(p.id)) {
                        posts.push(p);
                        seen.add(p.id);
                    }
                }
            } catch (e) { /* ignore global fallback error */ }
        }

        return {
            posts,
            after: data.data.after,
        };
    } catch (e) {
        console.error("Reddit Search Error:", e);
        return { posts: [], after: null };
    }
}

/**
 * Get posts from a subreddit
 */
export async function getSubredditPosts(
    subreddit: string,
    options: {
        sort?: 'hot' | 'new' | 'rising' | 'top';
        time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
        limit?: number;
    } = {}
): Promise<RedditPost[]> {
    const { sort = 'hot', time = 'week', limit = 25 } = options;

    const params = new URLSearchParams({
        limit: limit.toString(),
    });

    if (sort === 'top') {
        params.set('t', time);
    }

    const data = await redditRequest(`/r/${subreddit}/${sort}.json?${params}`) as {
        data: { children: { data: Record<string, unknown> }[] };
    };

    return data.data.children.map(transformPost);
}

/**
 * Get thread details including comments
 */
export async function getThreadDetails(subreddit: string, postId: string): Promise<{
    post: RedditPost;
    commentCount: number;
}> {
    const data = await redditRequest(`/r/${subreddit}/comments/${postId}.json?limit=1`) as [
        { data: { children: { data: Record<string, unknown> }[] } },
        { data: { children: unknown[] } }
    ];

    const post = transformPost(data[0].data.children[0]);
    const commentCount = data[1]?.data?.children?.length || 0;

    return { post, commentCount };
}

/**
 * Calculate opportunity score for a Reddit post
 */
export function calculateOpportunityScore(
    post: RedditPost,
    keywords: string[] = []
): number {
    let score = 0;
    const now = Date.now() / 1000;
    const ageHours = (now - post.createdUtc) / 3600;

    // Engagement score (max 30)
    score += Math.min(20, post.score / 5);
    score += Math.min(10, post.numComments / 2);

    // Recency bonus (max 25)
    if (ageHours < 1) score += 25;
    else if (ageHours < 6) score += 20;
    else if (ageHours < 24) score += 15;
    else if (ageHours < 72) score += 10;
    else if (ageHours < 168) score += 5;

    // Keyword match bonus (max 25)
    const title = post.title.toLowerCase();
    const body = post.selftext.toLowerCase();
    const text = `${title} ${body}`;

    for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
            score += 5;
        }
    }
    score = Math.min(score, 55 + 25); // Cap keyword bonus

    // Intent detection bonus (max 20)
    const buyingIntents = ['recommend', 'best', 'should i buy', 'worth it', 'looking for', 'help me choose', 'suggestions', 'under'];
    const compareIntents = ['vs', 'versus', 'compared to', 'difference between', 'or'];

    const hasBuyingIntent = buyingIntents.some(i => text.includes(i));
    const hasCompareIntent = compareIntents.some(i => text.includes(i));

    if (hasBuyingIntent) score += 20;
    else if (hasCompareIntent) score += 15;

    // Penalties
    if (post.isLocked) score -= 50;
    if (post.over18) score -= 30;

    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Check if Reddit API is configured
 */
export function isRedditConfigured(): boolean {
    // We now support public fallback, so it's always "configured" enough to work.
    // Ideally, we'd check if we have creds for *better* rates, but for the blocked UI check, true is fine.
    return true;
}
