import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceId } from '@/lib/data-access';
import {
    searchReddit,
    getSubredditPosts,
    calculateOpportunityScore,
    isRedditConfigured
} from '@/lib/integrations/reddit-client';
import { searchYouTube, calculateYouTubeOpportunityScore } from '@/lib/integrations/youtube-client';
import { searchForums, isGoogleSearchConfigured, convertToThreadFormat } from '@/lib/integrations/google-search-client';
import { searchStackExchange, convertSOToThreadFormat } from '@/lib/integrations/stackexchange-client';
import { searchHN, convertHNToThreadFormat } from '@/lib/integrations/hackernews-client';

interface DiscoveredThread {
    platform: string;
    external_id: string;
    title: string;
    url: string;
    subreddit: string | null;
    author: string | null;
    score: number;
    num_comments: number;
    opportunity_score: number;
    created_at: string;
}

export async function POST(request: NextRequest) {
    try {
        const redditConfigured = isRedditConfigured();
        const youtubeConfigured = !!process.env.YOUTUBE_API_KEY;
        const googleSearchConfigured = isGoogleSearchConfigured();

        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            query,
            subreddits = [],
            keywords = [],
            sort = 'relevance',
            time = 'month',
            limit = 25,
            platforms = [], // optional: filter to specific platforms
        } = body;

        if (!query && subreddits.length === 0) {
            return NextResponse.json(
                { error: 'Either query or subreddits is required' },
                { status: 400 }
            );
        }

        const searchQuery = query || keywords.join(' ');
        const allThreads: DiscoveredThread[] = [];
        const searchPromises: Promise<void>[] = [];
        const sourceStatus: Record<string, string> = {};

        const shouldSearch = (platform: string) =>
            platforms.length === 0 || platforms.includes(platform);

        // 1. Reddit (if configured and requested)
        if (redditConfigured && shouldSearch('reddit')) {
            let redditPromise: Promise<any[]> = Promise.resolve([]);

            if (query) {
                redditPromise = searchReddit(query, { subreddits, sort, time, limit })
                    .then(res => res.posts)
                    .catch(e => {
                        sourceStatus['reddit'] = `Error: ${e.message}`;
                        return [];
                    });
            } else if (subreddits.length > 0) {
                redditPromise = Promise.all(
                    subreddits.map((sub: string) =>
                        getSubredditPosts(sub, { sort: sort as 'hot' | 'new' | 'rising' | 'top', time, limit: Math.floor(limit / subreddits.length) || 10 })
                    )
                ).then(all => all.flat())
                    .catch(e => {
                        sourceStatus['reddit'] = `Error: ${e.message}`;
                        return [];
                    });
            }

            searchPromises.push(
                redditPromise.then(redditPosts => {
                    const processed = redditPosts
                        .filter((post: any) => !post.isLocked && !post.over18)
                        .map((post: any) => ({
                            platform: 'reddit',
                            external_id: post.id,
                            title: post.title,
                            url: post.url,
                            subreddit: post.subreddit,
                            author: post.author,
                            score: post.score,
                            num_comments: post.numComments,
                            opportunity_score: calculateOpportunityScore(post, keywords),
                            created_at: new Date(post.createdUtc * 1000).toISOString(),
                        }));

                    if (processed.length > 0) {
                        allThreads.push(...processed);
                        sourceStatus['reddit'] = 'ok';
                    }
                })
            );
        }

        // 2. YouTube (if configured and requested)
        if (youtubeConfigured && searchQuery && shouldSearch('youtube')) {
            searchPromises.push(
                searchYouTube(searchQuery, { maxResults: limit })
                    .then(res => {
                        const processed = res.videos.map((video: any) => ({
                            platform: 'youtube',
                            external_id: video.id,
                            title: video.title,
                            url: video.url,
                            subreddit: video.channelTitle,
                            author: video.channelTitle,
                            score: video.viewCount || 0,
                            num_comments: video.commentCount || 0,
                            opportunity_score: calculateYouTubeOpportunityScore(video, keywords),
                            created_at: video.publishedAt,
                        }));
                        allThreads.push(...processed);
                        if (processed.length > 0) sourceStatus['youtube'] = 'ok';
                    })
                    .catch(e => { sourceStatus['youtube'] = `Error: ${e.message}`; })
            );
        }

        // 3. Stack Exchange (always available, no auth needed)
        if (searchQuery && shouldSearch('stackoverflow')) {
            searchPromises.push(
                searchStackExchange(searchQuery, { pageSize: Math.min(limit, 20) })
                    .then(({ questions }) => {
                        const processed = convertSOToThreadFormat(questions, keywords);
                        allThreads.push(...processed);
                        if (processed.length > 0) sourceStatus['stackoverflow'] = 'ok';
                    })
                    .catch(e => { sourceStatus['stackoverflow'] = `Error: ${e.message}`; })
            );
        }

        // 4. Hacker News (always available, no auth needed)
        if (searchQuery && shouldSearch('hackernews')) {
            searchPromises.push(
                searchHN(searchQuery, { hitsPerPage: Math.min(limit, 20) })
                    .then(({ stories }) => {
                        const processed = convertHNToThreadFormat(stories, keywords);
                        allThreads.push(...processed);
                        if (processed.length > 0) sourceStatus['hackernews'] = 'ok';
                    })
                    .catch(e => { sourceStatus['hackernews'] = `Error: ${e.message}`; })
            );
        }

        // 5. Google Custom Search (cross-platform discovery)
        if (googleSearchConfigured && searchQuery && shouldSearch('google')) {
            searchPromises.push(
                searchForums(searchQuery, { limit: 10 })
                    .then(({ results }) => {
                        const processed = convertToThreadFormat(results, keywords);
                        allThreads.push(...processed);
                        if (processed.length > 0) sourceStatus['google'] = 'ok';
                    })
                    .catch(e => { sourceStatus['google'] = `Error: ${e.message}`; })
            );
        }

        // Check if at least one source is available
        const anySourceAvailable = youtubeConfigured || googleSearchConfigured || true; // SE + HN always available
        if (!anySourceAvailable) {
            return NextResponse.json(
                { error: 'No forum sources available.' },
                { status: 503 }
            );
        }

        await Promise.all(searchPromises);

        // Deduplicate by URL (Google Search may return same URLs as direct API)
        const seenUrls = new Set<string>();
        const uniqueThreads = allThreads.filter(thread => {
            const normalizedUrl = thread.url.replace(/\/$/, '').toLowerCase();
            if (seenUrls.has(normalizedUrl)) return false;
            seenUrls.add(normalizedUrl);
            return true;
        });

        // Sort by opportunity score
        uniqueThreads.sort((a, b) => b.opportunity_score - a.opportunity_score);

        // Save to database (upsert using admin client because background jobs lose auth.uid context)
        const supabaseAdmin = createAdminClient();
        const savedThreads = [];

        // Map platform names to DB-safe values (CHECK constraint only allows specific values)
        const DB_SAFE_PLATFORMS: Record<string, string> = {
            'reddit': 'reddit',
            'youtube': 'youtube',
            'quora': 'quora',
            'teambhp': 'teambhp',
            'xbhp': 'xbhp',
            'hackernews': 'hackernews',
            'stackoverflow': 'stackoverflow',
            'web': 'web',
        };

        for (const item of uniqueThreads) {
            const dbPlatform = DB_SAFE_PLATFORMS[item.platform] || 'other';
            // Store the original platform name in subreddit field for UI display if not already set
            const displayLabel = item.subreddit || item.platform;

            const { data, error } = await supabaseAdmin
                .from('forum_threads')
                .upsert({
                    workspace_id: workspaceId,
                    platform: dbPlatform,
                    external_id: item.external_id,
                    title: item.title,
                    url: item.url,
                    subreddit: displayLabel,
                    score: item.score || 0,
                    num_comments: item.num_comments || 0,
                    opportunity_score: item.opportunity_score || 0,
                    status: 'discovered',
                }, {
                    onConflict: 'workspace_id,platform,external_id',
                    ignoreDuplicates: false,
                })
                .select()
                .single();

            if (!error && data) {
                savedThreads.push(data);
            } else if (error) {
                console.error(`DB Upsert Failed for [${item.platform}] ${item.url}:`, error.message);
            }
        }

        // Build warnings
        const warnings: string[] = [];
        if (!redditConfigured) warnings.push('Reddit API not configured (re-apply for access).');
        if (!youtubeConfigured) warnings.push('YouTube API not configured.');
        if (!googleSearchConfigured) warnings.push('Google Custom Search not configured. Add GOOGLE_CSE_ID for cross-platform discovery.');

        return NextResponse.json({
            success: true,
            discovered: uniqueThreads.length,
            saved: savedThreads.length,
            threads: savedThreads,
            sourceStatus,
            warnings,
        });
    } catch (error) {
        console.error('Forum discovery error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Discovery failed',
                details: error,
                success: false
            },
            { status: 500 }
        );
    }
}

// GET endpoint to check source configuration status
export async function GET() {
    const sources = {
        reddit: isRedditConfigured(),
        youtube: !!process.env.YOUTUBE_API_KEY,
        stackoverflow: true,  // always available
        hackernews: true,     // always available
        google: isGoogleSearchConfigured(),
    };

    const activeCount = Object.values(sources).filter(Boolean).length;

    return NextResponse.json({
        sources,
        activeCount,
        message: `${activeCount} forum sources active.`,
    });
}
