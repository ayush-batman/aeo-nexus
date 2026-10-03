import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { convexRouteError } from '@/lib/convex/http';
import { getConvexWorkspaceContext } from '@/lib/convex/session';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
    try {
        const requestedWorkspaceId = new URL(request.url).searchParams.get('workspaceId');
        if (requestedWorkspaceId !== null && !UUID_PATTERN.test(requestedWorkspaceId)) {
            return NextResponse.json({ error: 'Please check the supplied values.' }, { status: 400 });
        }
        // The dashboard bootstrap already resolved this ID. Convex still verifies
        // session membership and workspace ownership inside dashboard.summary.
        const workspaceId = requestedWorkspaceId ?? (await getConvexWorkspaceContext())?.workspaceId;
        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }
        return NextResponse.json(await fetchAuthQuery(api.dashboard.summary, {
            workspaceId,
            asOf: Date.now(),
        }));
    } catch (error) {
        return convexRouteError(error);
    }
}
