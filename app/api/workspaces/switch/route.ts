import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

// POST: Switch active workspace
export async function POST(request: NextRequest) {
    try {
        // Route through the shared helper so dev-auth-bypass works here.
        const context = await getCurrentWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { workspaceId } = body;
        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        const db = createAdminClient();

        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('org_id', context.orgId)
            .single();

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found or unauthorized' }, { status: 404 });
        }

        // Set cookie-based active workspace
        const cookieStore = await cookies();
        cookieStore.set('active-workspace-id', workspaceId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            httpOnly: true,
            sameSite: 'lax',
        });

        return NextResponse.json({ success: true, workspaceId });
    } catch (error) {
        console.error('Error switching workspace:', error);
        return NextResponse.json({ error: 'Failed to switch workspace' }, { status: 500 });
    }
}
