import { NextResponse } from 'next/server';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery, fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const [user, organization, workspace] = await Promise.all([
      fetchAuthQuery(api.settings.profile, {}), fetchAuthQuery(api.settings.organization, { orgId: context.orgId }),
      fetchAuthQuery(api.workspaces.get, { workspaceId: context.workspaceId }),
    ]);
    const team: FunctionReturnType<typeof api.settings.members>['page'] = [];
    let cursor: string | null = null;
    do {
      const result: FunctionReturnType<typeof api.settings.members> = await fetchAuthQuery(api.settings.members, { paginationOpts: { cursor, numItems: 100 } });
      team.push(...result.page); cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);
    return NextResponse.json({ user, organization, workspace, team });
  } catch (error) { return convexRouteError(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || !['profile', 'workspace'].includes(body.kind)) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    if (body.kind === 'profile') {
      if (typeof body.fullName !== 'string') return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      await fetchAuthMutation(api.settings.saveProfile, { fullName: body.fullName });
    } else {
      if ((body.name !== undefined && typeof body.name !== 'string') || (body.competitors !== undefined &&
        (!Array.isArray(body.competitors) || body.competitors.some((name: unknown) => typeof name !== 'string')))) return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
      await fetchAuthMutation(api.settings.saveWorkspace, { workspaceId: context.workspaceId,
        ...(body.name === undefined ? {} : { name: body.name }), ...(body.competitors === undefined ? {} : { competitors: body.competitors }) });
    }
    return NextResponse.json({ success: true });
  } catch (error) { return convexRouteError(error); }
}
