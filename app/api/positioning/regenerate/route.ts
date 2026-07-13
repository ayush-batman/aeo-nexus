import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { regeneratePositioning } from '@/lib/analytics/positioning';

export async function POST() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();
    const { data: ws, error } = await db
        .from('workspaces')
        .select('name, settings')
        .eq('id', ctx.workspaceId)
        .single();

    if (error || !ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const brandName   = ws.name;
    const competitors = (ws.settings as { competitors?: string[] } | null)?.competitors ?? [];

    try {
        const result = await regeneratePositioning({
            workspaceId: ctx.workspaceId,
            brandName,
            competitors,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[positioning/regenerate] failed:', err);
        return NextResponse.json({ error: 'Regenerate failed', detail: String(err) }, { status: 500 });
    }
}
