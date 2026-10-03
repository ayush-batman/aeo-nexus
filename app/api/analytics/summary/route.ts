import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { summarizeTrafficEvents } from '@/lib/analytics/traffic-summary';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const since = Date.now() - 30 * 86400_000;
    const summary = await summarizeTrafficEvents((cursor) => fetchAuthQuery(api.traffic.events, {
      workspaceId: context.workspaceId, since, paginationOpts: { cursor, numItems: 500 },
    }));
    return NextResponse.json({ ...summary,
      measurementBasis: 'Observed pageview events from the last 30 days; not verified unique people or crawler requests.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return convexRouteError(error); }
}
