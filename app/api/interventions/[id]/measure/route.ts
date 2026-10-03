import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation, fetchAuthQuery } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const jobId = await fetchAuthMutation(api.actionMeasurements.begin, { workspaceId: context.workspaceId, id,
      requestId: request.headers.get('idempotency-key') || crypto.randomUUID() });
    return NextResponse.json({ jobId, status: 'running', statusUrl: `/api/interventions/${id}/measure?job=${jobId}` }, { status: 202 });
  } catch (error) { return convexRouteError(error); }
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params, jobId = request.nextUrl.searchParams.get('job');
    if (!jobId) return NextResponse.json({ error: 'Missing job' }, { status: 400 });
    return NextResponse.json(await fetchAuthQuery(api.actionMeasurements.get, { workspaceId: context.workspaceId, id, jobId }));
  } catch (error) { return convexRouteError(error); }
}
