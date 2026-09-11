import { NextRequest, NextResponse } from 'next/server';
import { readMeasurement } from '@/lib/convex/measurement-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { evidenceJson } from '@/lib/http-json';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const run = await readMeasurement(context.workspaceId, id);
    return evidenceJson({ runId: id, runStatus: run.status, measurement: run.result });
  } catch (error) { return convexRouteError(error); }
}
