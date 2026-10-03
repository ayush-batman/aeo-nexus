import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await fetchAuthAction(api.trafficActions.installToken, { workspaceId: context.workspaceId }), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return convexRouteError(error); }
}
