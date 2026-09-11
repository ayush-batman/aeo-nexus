import { NextResponse } from 'next/server';
import { api, internal } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { fetchAuthAction, fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { callInternal } from '@/lib/convex/admin';
import { readBoundedJson } from '@/lib/analytics-ingest';
import { convexRouteError } from '@/lib/convex/http';
import { attributionSummary } from '@/lib/attribution';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
export async function POST(request: Request) {
  try {
    const body = await readBoundedJson(request, 16384);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid response' }, { status: 400, headers: cors });
    if ('ingestToken' in body) await callInternal('action', internal.attributionActions.submitPublic, { body: JSON.stringify(body),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown' });
    else {
      const context = await getConvexWorkspaceContext();
      if (!context) return NextResponse.json({ error: 'A survey install token is required.' }, { status: 401, headers: cors });
      if ('workspaceId' in body && body.workspaceId !== context.workspaceId) return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403, headers: cors });
      await fetchAuthAction(api.attributionActions.submit, { body: JSON.stringify({ ...body, workspaceId: context.workspaceId }) });
    }
    return NextResponse.json({ success: true }, { headers: cors });
  } catch (error) {
    const response = convexRouteError(error);
    for (const [key, value] of Object.entries(cors)) response.headers.set(key,value);
    return response;
  }
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: cors }); }
export async function GET() {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const responses = await fetchAuthQuery(api.attribution.legacy, { workspaceId: context.workspaceId });
    let cursor: string | null = null;
    do {
      const page: FunctionReturnType<typeof api.attribution.responses> = await fetchAuthQuery(api.attribution.responses, { workspaceId: context.workspaceId, paginationOpts: { cursor, numItems: 100 } });
      responses.push(...page.page); cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    return NextResponse.json({ ...attributionSummary(responses), workspaceId: context.workspaceId, canInstall: context.role !== 'viewer' });
  } catch (error) { return convexRouteError(error); }
}
