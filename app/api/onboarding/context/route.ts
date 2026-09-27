import { NextResponse } from 'next/server';
import { getConvexDashboardBootstrap } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { workspaceBootstrapTelemetry, type WorkspaceBootstrapTimings } from '@/lib/observability/workspace-bootstrap';

export async function GET() {
    const started = performance.now();
    const timings: WorkspaceBootstrapTimings = { tokenMs: null, backendMs: null, provisioned: false };
    let response: NextResponse;
    try {
        const context = await getConvexDashboardBootstrap(timings);

        if (!context) {
            response = NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        } else {
            response = NextResponse.json(context);
        }
    } catch (error) {
        response = convexRouteError(error);
    }
    const telemetry = workspaceBootstrapTelemetry(response.status, performance.now() - started, timings);
    response.headers.set('Server-Timing', telemetry.serverTiming);
    response.headers.set('Cache-Control', 'no-store');
    console.info(JSON.stringify({
        event: telemetry.event,
        status: telemetry.status,
        duration_ms: telemetry.duration_ms,
        token_ms: telemetry.token_ms,
        backend_ms: telemetry.backend_ms,
        provisioned: telemetry.provisioned,
    }));
    return response;
}
