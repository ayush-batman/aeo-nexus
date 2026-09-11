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
    if (!body || typeof body.prompt !== 'string' || (body.count !== undefined && typeof body.count !== 'number')) return NextResponse.json({ error: 'Invalid question' }, { status: 400 });
    return NextResponse.json(await fetchAuthAction(api.contentActions.variants, { workspaceId: context.workspaceId, prompt: body.prompt, count: body.count ?? 5 }));
  } catch (error) { return convexRouteError(error); }
}
