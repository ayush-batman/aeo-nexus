import { redirect } from 'next/navigation';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { loadAccuracySummary, type AccuracySummary } from '@/lib/analytics/accuracy';
import { Header } from '@/components/dashboard/header';
import { AccuracyView } from '@/components/dashboard/accuracy-view';

export const dynamic = 'force-dynamic';

const PAID_PLANS = new Set(['starter', 'pro', 'agency', 'enterprise']);

export default async function AccuracyPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    const org = await fetchAuthQuery(api.settings.organization, { orgId: ctx.orgId });
    const plan = org.plan;
    const paidTier = PAID_PLANS.has(plan);

    let summary: AccuracySummary = {
        total: 0,
        counts: { true: 0, false: 0, outdated: 0, unverified: 0 },
        accuracyPct: null,
        rows: [],
        lastUpdated: null,
    };
    let missingTable = false;
    try {
        if (paidTier) summary = await loadAccuracySummary(ctx.workspaceId);
    } catch (err) {
        console.warn('[accuracy] evidence load failed');
        missingTable = true;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="Accuracy Verdict"
                description="Every factual claim the LLM made about you, checked against your own site. True, false, outdated, or unverified."
            />
            <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
                <AccuracyView summary={summary} paidTier={paidTier} plan={plan} missingTable={missingTable} />
            </main>
        </div>
    );
}
