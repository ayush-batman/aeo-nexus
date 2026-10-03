import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery, fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [recent, unreadCount] = await Promise.all([
      fetchAuthQuery(api.alerts.notifications, { workspaceId: context.workspaceId, paginationOpts: { cursor: null, numItems: 20 } }),
      fetchAuthQuery(api.alerts.unreadBadgeCount, { workspaceId: context.workspaceId }),
    ]);
    return NextResponse.json({ notifications: recent.page, unreadCount,
      unreadCountMayBeHigher: unreadCount === 10 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return convexRouteError(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const ids = body?.ids ?? [];
    if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string') || (!ids.length && body?.markAllRead !== true)) {
      return NextResponse.json({ error: 'Provide notification IDs or markAllRead' }, { status: 400 });
    }
    // One bounded mutation per request avoids a long-running serverless request
    // when a workspace has accumulated many unread notifications.
    const { more } = await fetchAuthMutation(api.alerts.markRead, {
      workspaceId: context.workspaceId, ids, markAllRead: body.markAllRead === true,
    });
    return NextResponse.json({ success: true, more });
  } catch (error) { return convexRouteError(error); }
}
