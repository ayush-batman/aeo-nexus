import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await fetchAuthMutation(api.apiKeys.revoke, { workspaceId: context.workspaceId, id });
    return NextResponse.json({ revoked: true });
  } catch (error) { return convexRouteError(error); }
}
