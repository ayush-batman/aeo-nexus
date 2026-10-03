import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.industry !== 'string' || (body.targetAudience !== undefined && typeof body.targetAudience !== 'string') ||
      (body.productName !== undefined && typeof body.productName !== 'string')) return NextResponse.json({ error: 'Invalid discovery' }, { status: 400 });
    const suggestions = await fetchAuthAction(api.forumActions.suggest, { workspaceId: context.workspaceId,
      industry: body.industry, targetAudience: body.targetAudience ?? '', productName: body.productName });
    return NextResponse.json({ success: true, suggestions, evidenceStatus: 'unverified_suggestions' });
  } catch (error) { return convexRouteError(error); }
}
