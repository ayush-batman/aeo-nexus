import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation, fetchAuthQuery } from '@/lib/auth-server';
import { convexRouteError } from '@/lib/convex/http';
import { getConvexWorkspaceContext } from '@/lib/convex/session';

function legacyWorkspace(row: { publicId: string; name: string; settings: unknown; createdAt: number }) {
    return { id: row.publicId, name: row.name, settings: row.settings, created_at: new Date(row.createdAt).toISOString() };
}

export async function GET(request: NextRequest) {
    try {
        const context = await getConvexWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (request.nextUrl.searchParams.get('current') === '1') {
            const workspace = await fetchAuthQuery(api.workspaces.get, { workspaceId: context.workspaceId });
            return NextResponse.json({ workspace: legacyWorkspace(workspace) }, { headers: { 'Cache-Control': 'no-store' } });
        }
        if (request.nextUrl.searchParams.get('page') === '1') {
            const cursor = request.nextUrl.searchParams.get('cursor');
            if (cursor !== null && (cursor.length < 1 || cursor.length > 4096)) {
                return NextResponse.json({ error: 'Invalid workspace cursor' }, { status: 400 });
            }
            const result = await fetchAuthQuery(api.workspaces.listPage, { paginationOpts: { cursor, numItems: 100 } });
            return NextResponse.json({ workspaces: result.page.map(legacyWorkspace),
                nextCursor: result.isDone ? null : result.continueCursor }, { headers: { 'Cache-Control': 'no-store' } });
        }
        const workspaces = await fetchAuthQuery(api.workspaces.list, {});
        return NextResponse.json({ workspaces: workspaces.map(legacyWorkspace) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) { return convexRouteError(error); }
}

export async function POST(request: NextRequest) {
    try {
        if (!await getConvexWorkspaceContext()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const body = await request.json().catch(() => null);
        if (typeof body?.name !== 'string' ||
            (body.website != null && typeof body.website !== 'string') ||
            (body.competitors != null && (!Array.isArray(body.competitors) || body.competitors.some((value: unknown) => typeof value !== 'string')))) {
            return NextResponse.json({ error: 'Check the brand name, website and competitors.' }, { status: 400 });
        }
        const result = await fetchAuthMutation(api.workspaces.create, {
            name: body.name, settings: { website: body.website?.trim() || null, competitors: body.competitors ?? [] },
        });
        if (result.status === 'denied') return NextResponse.json({ error: `This plan allows ${result.limit} brand workspace(s)` }, { status: 403 });
        return NextResponse.json({ workspace: legacyWorkspace(result.workspace),
            measurementStatus: 'queued', measurementJobId: result.measurementJobPublicId });
    } catch (error) { return convexRouteError(error); }
}
