import { NextRequest, NextResponse } from 'next/server';
import { convexRouteError } from '@/lib/convex/http';
import { updateScheduledScan, deleteScheduledScan } from '@/lib/data-access';
import { getCurrentWorkspaceId } from '@/lib/data-access';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const allowed = new Set(['prompt', 'platforms', 'competitors', 'frequency', 'status']);
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !allowed.has(key)) ||
            (body.prompt !== undefined && typeof body.prompt !== 'string') ||
            (body.platforms !== undefined && (!Array.isArray(body.platforms) || body.platforms.some((value: unknown) => typeof value !== 'string'))) ||
            (body.competitors !== undefined && (!Array.isArray(body.competitors) || body.competitors.some((value: unknown) => typeof value !== 'string'))) ||
            (body.frequency !== undefined && !['daily', 'weekly', 'monthly'].includes(body.frequency)) ||
            (body.status !== undefined && !['active', 'paused'].includes(body.status))) {
            return NextResponse.json({ error: 'Check the schedule changes.' }, { status: 400 });
        }
        const { id } = await params;

        const updatedSchedule = await updateScheduledScan(id, body);

        if (!updatedSchedule) {
            return NextResponse.json({ error: 'Failed to update schedule' }, { status: 404 });
        }

        return NextResponse.json(updatedSchedule);
    } catch (error) {
        return convexRouteError(error);
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const success = await deleteScheduledScan(id);

        if (!success) {
            return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return convexRouteError(error);
    }
}
