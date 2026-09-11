import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { legacyThread } from '@/lib/convex/records';
import { getForumThreads } from '@/lib/data-access';

export async function GET(request: NextRequest) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const params = request.nextUrl.searchParams;
    const minScore = Number(params.get('minScore') ?? 0);
    const limit = Number(params.get('limit') ?? 20);
    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100)
      return NextResponse.json({ error: 'Invalid limits' }, { status: 400 });
    const threads = await getForumThreads(context.workspaceId, {
      status: params.get('status') || undefined, platform: params.get('platform') || undefined, minScore, limit,
    });
    return NextResponse.json({ threads });
  } catch (error) { return convexRouteError(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.threadId !== 'string' ||
      (body.status !== undefined && typeof body.status !== 'string') ||
      (body.commentDraft !== undefined && body.commentDraft !== null && typeof body.commentDraft !== 'string'))
      return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
    const row = await fetchAuthMutation(api.forum.update, { workspaceId: context.workspaceId, id: body.threadId,
      ...(body.status === undefined ? {} : { status: body.status }),
      ...(body.commentDraft === undefined ? {} : { commentDraft: body.commentDraft }) });
    return NextResponse.json({ thread: legacyThread(row, context.workspaceId) });
  } catch (error) { return convexRouteError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || !['platform', 'externalId', 'url', 'title'].every(key => typeof body[key] === 'string') ||
      !['text', 'subreddit', 'author'].every(key => body[key] === undefined || typeof body[key] === 'string') ||
      !['score', 'numComments', 'opportunityScore'].every(key => body[key] === undefined || (typeof body[key] === 'number' && Number.isFinite(body[key]))))
      return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
    const row = await fetchAuthMutation(api.forum.save, { workspaceId: context.workspaceId, thread: {
      platform: body.platform, externalId: body.externalId, url: body.url, title: body.title,
      text: body.text, subreddit: body.subreddit, author: body.author,
      score: body.score, numComments: body.numComments, opportunityScore: body.opportunityScore,
    } });
    return NextResponse.json({ thread: legacyThread(row, context.workspaceId) }, { status: 201 });
  } catch (error) { return convexRouteError(error); }
}
