import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { regenerateAccuracy } from '@/lib/analytics/accuracy';

// Paid-tier gate: Accuracy Verdict is where the value story lives.
// Free stays visibility-only; starter+ unlocks accuracy.
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
    const plan = org?.plan ?? 'free';
    if (!PAID_PLANS.has(plan)) {
        return NextResponse.json({
            error: 'plan_required',
            message: 'Accuracy Verdict requires the Starter plan or higher.',
        }, { status: 402 });
    }

    const { data: ws, error } = await db
        .from('workspaces')
        .select('name, settings')
        .eq('id', ctx.workspaceId)
        .single();
    if (error || !ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const brandName = ws.name;
    const website   = (ws.settings as { website?: string } | null)?.website ?? null;

    try {
        const result = await regenerateAccuracy({ workspaceId: ctx.workspaceId, brandName, website });
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[accuracy/verify] failed:', err);
        return NextResponse.json({ error: 'Verify failed', detail: String(err) }, { status: 500 });
    }
}
