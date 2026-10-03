import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    const { id } = await params;
    const intervention = await fetchAuthMutation(api.actions.save, { workspaceId: context.workspaceId, id, inputJson: JSON.stringify(body),
      requestId: request.headers.get('idempotency-key') || crypto.randomUUID() });
    return NextResponse.json({ intervention });
  } catch (error) { return convexRouteError(error); }
}
