import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation, fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';

export async function GET(request: NextRequest) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const result = await fetchAuthQuery(api.products.list, { workspaceId: context.workspaceId,
      paginationOpts: { numItems: 50, cursor: request.nextUrl.searchParams.get('cursor') } });
    return NextResponse.json({ products: result.page, nextCursor: result.isDone ? null : result.continueCursor });
  } catch (error) { return convexRouteError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    if (typeof body?.name !== 'string' || !Array.isArray(body.keywords) || body.keywords.some((word: unknown) => typeof word !== 'string') ||
        (body.description != null && typeof body.description !== 'string') || (body.website != null && typeof body.website !== 'string') ||
        (body.id !== undefined && typeof body.id !== 'string')) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }
    return NextResponse.json(await fetchAuthMutation(api.products.save, { workspaceId: context.workspaceId,
      ...(body.id ? { id: body.id } : {}), name: body.name, description: body.description ?? null,
      website: body.website ?? null, keywords: body.keywords }));
  } catch (error) { return convexRouteError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    await fetchAuthMutation(api.products.remove, { workspaceId: context.workspaceId, id });
    return NextResponse.json({ success: true });
  } catch (error) { return convexRouteError(error); }
}
