import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { regeneratePositioning } from '@/lib/analytics/positioning';

// Paid-tier gate: Competitor Positioning is a premium feature.
const PAID_PLANS = new Set(['starter', 'pro', 'agency', 'enterprise']);

export async function POST() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();

    const { data: org } = await db
        .from('organizations')
        .select('plan')
        .eq('id', ctx.orgId)
        .single();
    if (!PAID_PLANS.has(org?.plan ?? 'free')) {
        return NextResponse.json({
            error: 'plan_required',
            message: 'Competitor Positioning requires the Starter plan or higher.',
        }, { status: 402 });
    }

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
