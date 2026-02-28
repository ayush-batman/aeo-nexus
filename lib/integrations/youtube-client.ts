
/**
 * YouTube Data API Client
 * 
 * Requires environment variables:
 * - YOUTUBE_API_KEY
 */

interface YouTubeVideo {
    id: string;
    title: string;
    description: string;
    url: string;
    thumbnail: string;
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
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('YouTube Search Failed:', response.status, errorText);
            return { videos: [] };
        }

        const data = await response.json();
        const videoIds = data.items.map((item: any) => item.id.videoId).join(',');

        // Fetch statistics for these videos to get view counts
        const stats = await getVideoStatistics(videoIds);

        const videos: YouTubeVideo[] = data.items.map((item: any) => {
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
        console.error('YouTube Search Error:', error);
        return { videos: [] };
    }
}

/**
 * Helper to batch fetch video statistics
 */
async function getVideoStatistics(videoIds: string): Promise<Map<string, any>> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || !videoIds) return new Map();

    try {
        const params = new URLSearchParams({
            part: 'statistics',
            id: videoIds,
            key: apiKey,
        });

        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
        if (!response.ok) return new Map();

        const data = await response.json();
        const statsMap = new Map();

        data.items.forEach((item: any) => {
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
    const published = new Date(video.publishedAt).getTime();
    const now = Date.now();
    const ageDays = (now - published) / (1000 * 60 * 60 * 24);

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
