import { NextRequest, NextResponse } from 'next/server';
import { convexRouteError } from '@/lib/convex/http';
import { getScheduledScans, createScheduledScan } from '@/lib/data-access';
import { getCurrentWorkspaceId } from '@/lib/data-access';

export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const schedules = await getScheduledScans(workspaceId);
        return NextResponse.json(schedules);
    } catch (error) {
        return convexRouteError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        if (!body || typeof body.prompt !== 'string' || !Array.isArray(body.platforms) ||
            body.platforms.some((value: unknown) => typeof value !== 'string') ||
            !['daily', 'weekly', 'monthly'].includes(body.frequency) ||
            (body.competitors !== undefined && (!Array.isArray(body.competitors) || body.competitors.some((value: unknown) => typeof value !== 'string')))) {
            return NextResponse.json({ error: 'Check the prompt, engines and frequency.' }, { status: 400 });
        }
        const { prompt, platforms, frequency, competitors } = body;

        if (!prompt || !platforms || !frequency) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const schedule = await createScheduledScan({
            workspace_id: workspaceId,
            prompt,
            platforms,
            frequency,
            competitors
        });

        if (!schedule) {
            return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
        }

        return NextResponse.json(schedule);
    } catch (error) {
        return convexRouteError(error);
    }
}
