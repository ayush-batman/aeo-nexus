import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext, readScanPages } from '@/lib/data-access';
import { buildCitationMap } from '@/lib/analytics/citation-map';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(buildCitationMap(await readScanPages(context.workspaceId)));
  } catch (error) { return convexRouteError(error); }
}
