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
    if (text.length > 60000) return NextResponse.json({ error: 'Content is too long.' }, { status: 413 });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.contentType !== 'string' || typeof body.topic !== 'string' || (body.targetKeyword !== undefined && typeof body.targetKeyword !== 'string')) return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    return NextResponse.json(await fetchAuthAction(api.contentActions.writer, { workspaceId: context.workspaceId,
      contentType: body.contentType, topic: body.topic, targetKeyword: body.targetKeyword }));
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    return convexRouteError(error);
  }
}
