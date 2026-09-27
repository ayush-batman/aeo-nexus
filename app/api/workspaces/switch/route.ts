import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { convexRouteError } from '@/lib/convex/http';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        if (typeof body?.workspaceId !== 'string' || !body.workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }
        // The cookie is a preference, never authorization. This tenant-bound
        // query verifies both the session and target workspace in one read.
        await fetchAuthQuery(api.workspaces.get, { workspaceId: body.workspaceId });
        (await cookies()).set('active-workspace-id', body.workspaceId, {
            path: '/', maxAge: 60 * 60 * 24 * 365, httpOnly: true,
            sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
        });
        return NextResponse.json({ success: true, workspaceId: body.workspaceId });
    } catch (error) { return convexRouteError(error); }
}
