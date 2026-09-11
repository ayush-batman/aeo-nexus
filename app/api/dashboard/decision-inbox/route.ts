import { NextResponse } from 'next/server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { readActions, readMembers } from '@/lib/convex/actions';
import { readScanPages } from '@/lib/data-access';
import { buildWeeklyDecisionInbox } from '@/lib/weekly-inbox';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [scans, actions, members] = await Promise.all([
      readScanPages(context.workspaceId, { since: Date.now() - 14 * 86400_000 }), readActions(context.workspaceId), readMembers(),
    ]);
    const inbox = buildWeeklyDecisionInbox(scans.filter(row => !row.failure_code && row.response.trim()), actions);
    return NextResponse.json({ ...inbox, memberNames: Object.fromEntries(members.map(member => [member.id, member.full_name || member.email])) });
  } catch (error) { return convexRouteError(error); }
}
