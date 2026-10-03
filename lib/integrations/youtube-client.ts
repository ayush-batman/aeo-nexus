
/**
 * YouTube Data API Client
 * 
 * Requires environment variables:
 * - YOUTUBE_API_KEY
 */

export interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnail?: string;
    channelTitle: string;
    publishedAt: string;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
}

interface YouTubeSearchResult {
    videos: YouTubeVideo[];
    nextPageToken?: string;
}

/**
 * Search YouTube for videos matching a query
 */
export async function searchYouTube(
    query: string,
    options: {
        maxResults?: number;
        order?: 'relevance' | 'date' | 'viewCount' | 'rating';
        publishedAfter?: string; // ISO 8601 date
        pageToken?: string;
    } = {}
): Promise<YouTubeSearchResult> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.warn('YOUTUBE_API_KEY not set. Returning empty results.');
        return { videos: [] };
    }

    const { maxResults = 10, order = 'relevance', publishedAfter, pageToken } = options;

    const params = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: maxResults.toString(),
        order,
        key: apiKey,
    });

    if (publishedAfter) params.append('publishedAfter', publishedAfter);
    if (pageToken) params.append('pageToken', pageToken);

    try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: AbortSignal.timeout(20000) });

        if (!response.ok) throw new Error('youtube_search_unavailable');

        const data = await response.json() as YouTubeSearchResponse;
        const videoIds = (data.items ?? []).map((item) => item.id.videoId).join(',');

        // Fetch statistics for these videos to get view counts
        const stats = await getVideoStatistics(videoIds);

        const videos: YouTubeVideo[] = (data.items ?? []).map((item) => {
            const id = item.id.videoId;
            const stat = stats.get(id);
            return {
                id,
                title: item.snippet.title,
                description: item.snippet.description,
                url: `https://www.youtube.com/watch?v=${id}`,
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                channelTitle: item.snippet.channelTitle,
                publishedAt: item.snippet.publishedAt,
                viewCount: stat?.viewCount ? parseInt(stat.viewCount) : 0,
                likeCount: stat?.likeCount ? parseInt(stat.likeCount) : 0,
                commentCount: stat?.commentCount ? parseInt(stat.commentCount) : 0,
            };
        });

        return {
            videos,
            nextPageToken: data.nextPageToken,
        };

    } catch (error) {
        throw new Error('youtube_search_unavailable', { cause: error });
    }
}

/**
 * Helper to batch fetch video statistics
 */
type YouTubeStatistic = { viewCount?: string; likeCount?: string; commentCount?: string };
type YouTubeSearchItem = {
    id: { videoId: string };
    snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } }; channelTitle: string; publishedAt: string };
};
type YouTubeSearchResponse = { items?: YouTubeSearchItem[]; nextPageToken?: string };

async function getVideoStatistics(videoIds: string): Promise<Map<string, YouTubeStatistic>> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || !videoIds) return new Map();

    try {
        const params = new URLSearchParams({
            part: 'statistics',
            id: videoIds,
            key: apiKey,
        });

        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) return new Map();

        const data = await response.json() as { items?: Array<{ id: string; statistics: YouTubeStatistic }> };
        const statsMap = new Map<string, YouTubeStatistic>();

        (data.items ?? []).forEach((item) => {
            statsMap.set(item.id, item.statistics);
        });

        return statsMap;
    } catch (error) {
        console.error('YouTube Stats Error:', error);
        return new Map();
    }
}

/**
 * Calculate opportunity score for a YouTube video
 * Based on views, recency, and engagement
 */
export function calculateYouTubeOpportunityScore(video: YouTubeVideo, keywords: string[] = []): number {
    let score = 0;

    // Recency (newer is better for "news" but older high-authority is also good)
    // Engagement
    const views = video.viewCount || 0;
    const comments = video.commentCount || 0;

    // Simple logic: High views + recent = trending opportunity
    // High views + old = evergreen authority (harder to displace)

    // Base score on reach
    if (views > 100000) score += 40;
    else if (views > 10000) score += 30;
    else if (views > 1000) score += 20;
    else score += 10;

    // Engagement bonus
    if (comments > 100) score += 20;
    else if (comments > 20) score += 10;

    // Keyword match
    const text = (video.title + ' ' + video.description).toLowerCase();
    const matches = keywords.filter(k => text.includes(k.toLowerCase())).length;
    score += Math.min(30, matches * 10);

    return Math.min(100, score);
}
