import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScheduledScans, createScheduledScan } from '@/lib/data-access';
import { getCurrentWorkspaceId } from '@/lib/data-access';

export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const schedules = await getScheduledScans(workspaceId);
        return NextResponse.json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
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
        console.error('Error creating schedule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
