import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        if (!status || !['active', 'paused'].includes(status)) {
            return NextResponse.json({ error: 'Valid status (active/paused) is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { id } = await params;
        const { data: updatedSchedule, error } = await supabase
            .from('scheduled_scans')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('workspace_id', workspaceId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ schedule: updatedSchedule });
    } catch (error) {
        console.error('Error updating scheduled scan:', error);
        return NextResponse.json({ error: 'Failed to update scheduled scan' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized or no workspace found' }, { status: 401 });
        }

        const { id } = await params;
        const supabase = await createClient();
        const { error } = await supabase
            .from('scheduled_scans')
            .delete()
            .eq('id', id)
            .eq('workspace_id', workspaceId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting scheduled scan:', error);
        return NextResponse.json({ error: 'Failed to delete scheduled scan' }, { status: 500 });
    }
}
