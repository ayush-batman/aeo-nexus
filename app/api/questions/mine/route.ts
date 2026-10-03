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
    const text = await request.text();
    if (text.length > 30000) return NextResponse.json({ error: 'Content is too long.' }, { status: 413 });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.sourceType !== 'string' || typeof body.input !== 'string' || typeof body.brandName !== 'string' || (body.industry !== undefined && typeof body.industry !== 'string')) return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    const result = await fetchAuthAction(api.contentActions.questions, { workspaceId: context.workspaceId,
      sourceType: body.sourceType, input: body.input, brandName: body.brandName, industry: body.industry });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    return convexRouteError(error);
  }
}
