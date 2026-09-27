import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { getConvexDashboardBootstrap } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { workspaceBootstrapTelemetry, type WorkspaceBootstrapTimings } from '@/lib/observability/workspace-bootstrap';

export async function GET(request: NextRequest) {
    const started = performance.now();
    const timings: WorkspaceBootstrapTimings = { tokenMs: null, backendMs: null, provisioned: false };
    let response: NextResponse;
    try {
        // A missing cookie can be rejected locally; a present cookie is only
        // a hint and still goes through the verified token and tenant query.
        if (!getSessionCookie(request)) {
            response = NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        } else {
            const context = await getConvexDashboardBootstrap(timings);
            response = context
                ? NextResponse.json(context)
                : NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
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
