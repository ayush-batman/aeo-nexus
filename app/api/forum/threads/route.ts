import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getForumThreads, getCurrentWorkspaceId } from '@/lib/data-access';

// GET: Fetch forum threads
export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status') || undefined;
        const platform = searchParams.get('platform') || undefined;
        const minScore = parseInt(searchParams.get('minScore') || '0', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const threads = await getForumThreads(workspaceId, {
            status,
            platform,
            minScore,
            limit,
        });

        return NextResponse.json({ threads });
    } catch (error) {
        console.error('Error fetching forum threads:', error);
        return NextResponse.json(
            { error: 'Failed to fetch forum threads' },
            { status: 500 }
        );
    }
}

// PATCH: Update thread status
export async function PATCH(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { threadId, status, commentDraft } = body;

        if (!threadId) {
            return NextResponse.json(
                { error: 'threadId is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        const updates: Record<string, unknown> = {};
        if (status) updates.status = status;
        if (commentDraft !== undefined) updates.comment_draft = commentDraft;

        const { data, error } = await supabase
            .from('forum_threads')
            .update(updates)
            .eq('id', threadId)
            .eq('workspace_id', workspaceId)
            .select()
            .single();

        if (error) {
            console.error('Error updating thread:', error);
            return NextResponse.json(
                { error: 'Failed to update thread' },
                { status: 500 }
            );
        }

        return NextResponse.json({ thread: data });
    } catch (error) {
        console.error('Error updating forum thread:', error);
        return NextResponse.json(
            { error: 'Failed to update forum thread' },
            { status: 500 }
        );
    }
}

// POST: Create a new forum thread (for manual addition or scraping results)
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        // Check usage limits
        const supabase = await createClient();
        const { data: workspaceData } = await supabase
            .from('workspaces')
            .select('org_id')
            .eq('id', workspaceId)
            .single();

        if (workspaceData?.org_id) {
            const { checkUsageLimit } = await import('@/lib/usage');
            const { allowed, limit, current } = await checkUsageLimit(workspaceData.org_id, 'threads');

            if (!allowed) {
                return NextResponse.json(
                    { error: `Plan limit reached (${current}/${limit} threads). Please upgrade your plan.` },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const {
            platform,
            externalId,
            url,
            title,
            text,
            subreddit,
            score = 0,
            numComments = 0,
            opportunityScore = 0,
            scoreBreakdown = {},
        } = body;

        if (!platform || !externalId || !url || !title) {
            return NextResponse.json(
                { error: 'platform, externalId, url, and title are required' },
                { status: 400 }
            );
        }



        const { data, error } = await supabase
            .from('forum_threads')
            .upsert({
                workspace_id: workspaceId,
                platform,
                external_id: externalId,
                url,
                title,
                text,
                subreddit,
                score,
                num_comments: numComments,
                opportunity_score: opportunityScore,
                score_breakdown: scoreBreakdown,
                status: 'discovered',
            }, {
                onConflict: 'workspace_id,platform,external_id'
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating thread:', error);
            return NextResponse.json(
                { error: 'Failed to create thread' },
                { status: 500 }
            );
        }

        return NextResponse.json({ thread: data });
    } catch (error) {
        console.error('Error creating forum thread:', error);
        return NextResponse.json(
            { error: 'Failed to create forum thread' },
            { status: 500 }
        );
    }
}
