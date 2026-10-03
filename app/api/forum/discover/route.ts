import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { legacyThread } from '@/lib/convex/records';
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid discovery' }, { status: 400 });
    const result = await fetchAuthAction(api.forumActions.discover, { workspaceId: context.workspaceId,
      query: body.query, subreddits: body.subreddits, keywords: body.keywords, sort: body.sort, time: body.time, limit: body.limit, platforms: body.platforms });
    return NextResponse.json({ ...result, threads: result.threads.map(row => legacyThread(row, context.workspaceId)) });
  } catch (error) { return convexRouteError(error); }
}
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await fetchAuthAction(api.forumActions.configuration, { workspaceId: context.workspaceId }));
  } catch (error) { return convexRouteError(error); }
}
