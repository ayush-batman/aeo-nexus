import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: Switch active workspace
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { workspaceId } = body;
        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        // Verify user owns this workspace
        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try { adminClient = createAdminClient(); } catch {}
        const db = adminClient ?? supabase;

        const { data: profile } = await db
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single();

        if (!profile?.org_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 400 });
        }

        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', workspaceId)
            .eq('org_id', profile.org_id)
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
