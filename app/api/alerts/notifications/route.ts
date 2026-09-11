import { NextResponse } from 'next/server';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery, fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const notifications: FunctionReturnType<typeof api.alerts.notifications>['page'] = [];
    let unreadCount = 0;
    let cursor: string | null = null;
    do {
      const result: FunctionReturnType<typeof api.alerts.notifications> = await fetchAuthQuery(api.alerts.notifications, { workspaceId: context.workspaceId, paginationOpts: { cursor, numItems: 100 } });
      unreadCount += result.page.filter(n => !n.read).length;
      if (notifications.length < 20) notifications.push(...result.page.slice(0, 20 - notifications.length));
      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);
    return NextResponse.json({ notifications, unreadCount });
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
    let more = false;
    do {
      ({ more } = await fetchAuthMutation(api.alerts.markRead, { workspaceId: context.workspaceId, ids, markAllRead: body.markAllRead === true }));
    } while (more);
    return NextResponse.json({ success: true });
  } catch (error) { return convexRouteError(error); }
}
