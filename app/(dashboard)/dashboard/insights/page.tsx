import { redirect } from 'next/navigation';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { generateInsights } from '@/lib/insights';
import { Header } from '@/components/dashboard/header';
import { InsightsBoard } from '@/components/dashboard/insights-board';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    const insights = await generateInsights(ctx.workspaceId);

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="Insights"
                description="What to fix next, generated from your scans and prioritised. Move a card as you act on it."
            />
            <main className="flex-1 px-6 py-8 max-w-[1400px] mx-auto w-full">
                {insights.length === 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                        <div className="text-lg font-medium text-[var(--text-primary)] mb-2">No insights yet</div>
                        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                            Run a few scans on your brand and Aelo will turn the results into a
                            prioritised list of what to fix. Insights refresh as new scans land.
                        </p>
                    </div>
                ) : (
                    <InsightsBoard insights={insights} workspaceId={ctx.workspaceId} />
                )}
            </main>
        </div>
    );
}
