import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';

async function mutationContext() {
    const context = await getCurrentWorkspaceContext();
    if (!context) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
    if (!requireWorkspaceRole(context, ['owner', 'admin', 'editor'])) {
        return { response: NextResponse.json({ error: 'Editor access required.' }, { status: 403 }) } as const;
    }
    return { context, admin: createAdminClient() } as const;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authorized = await mutationContext();
    if ('response' in authorized) return authorized.response;
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const status = body?.status;
    if (status !== 'active' && status !== 'paused') {
        return NextResponse.json({ error: 'Status must be active or paused.' }, { status: 400 });
    }

    const { id } = await params;
    const { data, error } = await authorized.admin
        .from('scheduled_scans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('workspace_id', authorized.context.workspaceId)
        .select()
        .maybeSingle();
    if (error) {
        console.error('[scheduled-scans/update] failed:', error);
        return NextResponse.json({ error: 'Failed to update scheduled scan.' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Scheduled scan not found.' }, { status: 404 });
    return NextResponse.json({ schedule: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authorized = await mutationContext();
    if ('response' in authorized) return authorized.response;
    const { id } = await params;
    const { data, error } = await authorized.admin
        .from('scheduled_scans')
        .delete()
        .eq('id', id)
        .eq('workspace_id', authorized.context.workspaceId)
        .select('id')
        .maybeSingle();
    if (error) {
        console.error('[scheduled-scans/delete] failed:', error);
        return NextResponse.json({ error: 'Failed to delete scheduled scan.' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'Scheduled scan not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
}
