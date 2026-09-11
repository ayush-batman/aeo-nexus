import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { fetchAuthMutation, fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const experiments: FunctionReturnType<typeof api.experiments.list>['page'] = [];
    let cursor: string | null = null;
    do {
      const page: FunctionReturnType<typeof api.experiments.list> = await fetchAuthQuery(api.experiments.list, { workspaceId: context.workspaceId, paginationOpts: { cursor, numItems: 100 } });
      experiments.push(...page.page); cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    return NextResponse.json({ experiments });
  } catch (error) { return convexRouteError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== 'string' || (body.hypothesis !== undefined && typeof body.hypothesis !== 'string') ||
      ![body.testQuestions, body.controlQuestions].every(group => Array.isArray(group) && group.every(item => typeof item === 'string')))
      return NextResponse.json({ error: 'Invalid experiment' }, { status: 400 });
    return NextResponse.json({ experiment: await fetchAuthMutation(api.experiments.create, { workspaceId: context.workspaceId, name: body.name,
      hypothesis: body.hypothesis, testQuestions: body.testQuestions, controlQuestions: body.controlQuestions }) }, { status: 201 });
  } catch (error) { return convexRouteError(error); }
}
export async function DELETE(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== 'string') return NextResponse.json({ error: 'Invalid experiment' }, { status: 400 });
    await fetchAuthMutation(api.experiments.remove, { workspaceId: context.workspaceId, id: body.id });
    return NextResponse.json({ success: true });
  } catch (error) { return convexRouteError(error); }
}
