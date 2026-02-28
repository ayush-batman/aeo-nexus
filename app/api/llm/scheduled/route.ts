import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

// GET: Fetch all scheduled scans for the workspace
export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
        }

        const supabase = await createClient();
        const { data: schedules, error } = await supabase
            .from('scheduled_scans')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        return NextResponse.json({ schedules });
    } catch (error) {
        console.error('Error fetching scheduled scans:', error);
        return NextResponse.json({ error: 'Failed to fetch scheduled scans' }, { status: 500 });
    }
}

// POST: Create a new scheduled scan
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, platforms, competitors = [], frequency = 'daily' } = body;

        if (!prompt || !platforms || platforms.length === 0) {
            return NextResponse.json({ error: 'Prompt and at least one platform are required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: newSchedule, error } = await supabase
            .from('scheduled_scans')
            .insert({
                workspace_id: workspaceId,
                prompt,
                platforms,
                competitors,
                frequency,
                status: 'active',
                next_run_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ schedule: newSchedule });
    } catch (error: any) {
        console.error('Error creating scheduled scan:', error);
        return NextResponse.json({ error: 'Failed to create scheduled scan', details: error.message || error }, { status: 500 });
    }
}
