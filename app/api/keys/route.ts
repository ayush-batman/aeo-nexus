import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction, fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';

export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ keys: await fetchAuthQuery(api.apiKeys.list, { workspaceId: context.workspaceId }) });
  } catch (error) { return convexRouteError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || (body.name !== undefined && typeof body.name !== 'string')) {
      return NextResponse.json({ error: 'Provide a key name.' }, { status: 400 });
    }
    const requested = body.scopes ?? ['read', 'measure'];
    if (!Array.isArray(requested) || !requested.length || requested.some((scope) => scope !== 'read' && scope !== 'measure')) {
      return NextResponse.json({ error: 'Supported permissions are read and measure.' }, { status: 400 });
    }
    const scopes: Array<'read' | 'measure'> = requested;
    const result = await fetchAuthAction(api.apiKeyActions.create, {
      workspaceId: context.workspaceId, name: body.name?.trim() || 'API key', scopes,
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return convexRouteError(error); }
}
