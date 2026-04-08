import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: List all workspaces for the current user's org
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try { adminClient = createAdminClient(); } catch {}
        const db = adminClient ?? supabase;

        const { data: profile } = await db
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single();

        if (!profile?.org_id) {
            return NextResponse.json({ workspaces: [] });
        }

        const { data: workspaces } = await db
            .from('workspaces')
            .select('id, name, settings, created_at')
            .eq('org_id', profile.org_id)
            .order('created_at', { ascending: true });

        return NextResponse.json({ workspaces: workspaces || [] });
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}

// POST: Create a new workspace (brand)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

        const body = await request.json();
        const { name, website, competitors } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
        }

        // Check max workspaces (limit to 5 for now)
        const { count } = await db
            .from('workspaces')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', profile.org_id);

        if ((count || 0) >= 5) {
            return NextResponse.json({ error: 'Maximum 5 brands per account' }, { status: 403 });
        }

        const { data: workspace, error } = await db
            .from('workspaces')
            .insert({
                org_id: profile.org_id,
                name: name.trim(),
                settings: {
                    website: website?.trim() || null,
                    competitors: competitors || [],
                },
            })
            .select('id, name, settings, created_at')
            .single();

        if (error) {
            console.error('Error creating workspace:', error);
            return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
        }

        return NextResponse.json({ workspace });
    } catch (error) {
        console.error('Error creating workspace:', error);
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }
}
