import { redirect } from 'next/navigation';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadAccuracySummary, type AccuracySummary } from '@/lib/analytics/accuracy';
import { Header } from '@/components/dashboard/header';
import { AccuracyView } from '@/components/dashboard/accuracy-view';

export const dynamic = 'force-dynamic';

const PAID_PLANS = new Set(['starter', 'pro', 'agency', 'enterprise']);

export default async function AccuracyPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    const demoSeed = process.env.AELO_DEMO_SEED === '1';
    const db = createAdminClient();
    const { data: org } = await db.from('organizations').select('plan').eq('id', ctx.orgId).single();
    const plan = demoSeed ? 'command' : (org?.plan ?? 'free');
    const paidTier = demoSeed || PAID_PLANS.has(plan);

    let summary: AccuracySummary = {
        total: 0,
        counts: { true: 0, false: 0, outdated: 0, unverified: 0 },
        accuracyPct: null,
        rows: [],
        lastUpdated: null,
    };
    let missingTable = false;
    try {
        summary = await loadAccuracySummary(ctx.workspaceId);
    } catch (err) {
        console.warn('[accuracy] load failed (migration 022 not applied?):', err);
        missingTable = true;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="Accuracy Verdict"
                description="Every factual claim the LLM made about you — checked against your own site. True, false, outdated, or unverified."
            />
            <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
                <AccuracyView summary={summary} paidTier={paidTier} plan={plan} missingTable={missingTable} />
            </main>
        </div>
    );
}
