import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Check, X, Bot, ArrowRight } from 'lucide-react';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkCrawlerAccess, getAiReferralTraffic } from '@/lib/crawlers';
import { Header } from '@/components/dashboard/header';

export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
    chatgpt: 'ChatGPT', gemini: 'Gemini', perplexity: 'Perplexity',
    claude: 'Claude', bing: 'Bing', copilot: 'Copilot',
};

export default async function CrawlersPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    // Workspace website (for the robots.txt check).
    const db = createAdminClient();
    const { data: ws } = await db
        .from('workspaces').select('settings').eq('id', ctx.workspaceId).single();
    const website = (ws?.settings as { website?: string } | null)?.website ?? null;

    const [access, traffic] = await Promise.all([
        checkCrawlerAccess(website),
        getAiReferralTraffic(ctx.workspaceId, 30),
    ]);

    const maxCount = Math.max(1, ...traffic.sources.map((s) => s.count));

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="AI Crawlers & Traffic"
                description="Whether AI can reach your site, and how much traffic it is sending back."
            />
            <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full space-y-6">

                {/* Panel 1: crawler access */}
                <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-medium text-[var(--text-primary)]">Can AI crawl you?</h2>
                        {access.ok && (
                            <span className="text-[13px] tabular-nums" style={{ color: access.blockedCount ? 'var(--data-red)' : 'var(--data-green)' }}>
                                {access.blockedCount ? `${access.blockedCount} blocked` : 'All allowed'}
                            </span>
                        )}
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-5">
                        {!website ? 'Add your website in Settings to check crawler access.'
                            : !access.ok ? 'Could not fetch your robots.txt. Check the domain in Settings.'
                            : !access.robotsFound ? 'No robots.txt found, so every AI crawler is allowed by default.'
                            : 'Parsed live from your robots.txt. A blocked crawler cannot cite you, whatever you publish.'}
                    </p>

                    {website && access.ok && (
                        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                            {access.results.map((r) => (
                                <div key={r.bot} className="flex items-center justify-between py-2 border-b border-[var(--border)]/60">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Bot className="h-4 w-4 flex-shrink-0 text-[var(--text-ghost)]" />
                                        <div className="min-w-0">
                                            <div className="text-[13.5px] text-[var(--text-primary)] font-mono">{r.bot}</div>
                                            <div className="text-[11px] text-[var(--text-ghost)]">{r.feeds}</div>
                                        </div>
                                    </div>
                                    {r.allowed ? (
                                        <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--data-green)' }}><Check className="h-3.5 w-3.5" /> Allowed</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: 'var(--data-red)' }}><X className="h-3.5 w-3.5" /> Blocked</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {!website && (
                        <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent-base)] hover:underline">
                            Add website <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </section>

                {/* Panel 2: AI referral traffic */}
                <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-medium text-[var(--text-primary)]">AI referral traffic</h2>
                        {traffic.hasPixelData && (
                            <span className="text-[13px] tabular-nums text-[var(--text-secondary)]">{traffic.total} visits · 30d</span>
                        )}
                    </div>

                    {traffic.hasPixelData ? (
                        <div className="mt-4 space-y-3">
                            {traffic.sources.map((s) => (
                                <div key={s.source} className="flex items-center gap-3">
                                    <div className="w-24 text-[13px] text-[var(--text-secondary)] flex-shrink-0">{SOURCE_LABEL[s.source] ?? s.source}</div>
                                    <div className="flex-1 h-6 rounded bg-[var(--bg-surface)] overflow-hidden">
                                        <div className="h-full rounded bg-[var(--accent-base)]/90" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                                    </div>
                                    <div className="w-10 text-right text-[13px] tabular-nums text-[var(--text-primary)]">{s.count}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-2">
                            <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                                Visits that arrive from an AI answer (ChatGPT, Gemini, Perplexity, Claude) show up here once the
                                Aelo pixel is installed on your site. No AI traffic recorded yet.
                            </p>
                            <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent-base)] hover:underline">
                                Install the pixel <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
