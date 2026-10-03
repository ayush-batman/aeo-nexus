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
      typeof body.schemaType !== 'string' || typeof body.brandName !== 'string' || (body.description !== undefined && typeof body.description !== 'string') || (body.targetKeyword !== undefined && typeof body.targetKeyword !== 'string')) return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    const result = await fetchAuthAction(api.contentActions.schema, { workspaceId: context.workspaceId,
      schemaType: body.schemaType, brandName: body.brandName, description: body.description, targetKeyword: body.targetKeyword });
    return NextResponse.json({ schema: JSON.parse(result.schemaJson), status: result.status, missingFields: result.missingFields, warning: result.warning });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    return convexRouteError(error);
  }
}
