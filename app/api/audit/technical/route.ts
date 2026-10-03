import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export const maxDuration = 90;
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.url !== 'string' || body.url.length > 2048) return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    return NextResponse.json(JSON.parse(await fetchAuthAction(api.auditActions.technical, { workspaceId: context.workspaceId, url: body.url })));
  } catch (error) { return convexRouteError(error); }
}
