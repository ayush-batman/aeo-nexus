import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function startAnalysis(kind: 'accuracy' | 'positioning') {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { jobId } = await fetchAuthMutation(api.analysis.begin, { workspaceId: context.workspaceId, kind });
    return NextResponse.json({ jobId, status: 'running', statusUrl: `/api/analysis/${jobId}` }, { status: 202 });
  } catch (error) { return convexRouteError(error); }
}
