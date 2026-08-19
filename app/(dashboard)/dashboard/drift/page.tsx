import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TrendingDown, TrendingUp, ArrowRight, Minus } from 'lucide-react';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getEntitlements } from '@/lib/entitlements';
import { loadDriftHistory, DRIFT_THRESHOLD } from '@/lib/analytics/sentiment-drift';
import { Header } from '@/components/dashboard/header';
import { PaidFeatureGate } from '@/components/billing/paid-feature-gate';

export const dynamic = 'force-dynamic';

const PLATFORM_LABEL: Record<string, string> = {
    chatgpt: 'ChatGPT',
    gemini:  'Gemini',
    claude:  'Claude',
    perplexity: 'Perplexity',
    google_ai_overview: 'Google AI Overview',
};

type Row = {
    prompt: string;
    platform: string;
    week_start: string;
    avg_sentiment: number;
    sample_size: number;
};

export default async function DriftPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    // Paid-only feature. Gate before loading any data so free users never see it.
    const ent = await getEntitlements(ctx.orgId);
    if (!ent.paid) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header
                    title="Sentiment Drift"
                    description="Track how the tone of AI answers about you moves over time."
                />
                <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
                    <PaidFeatureGate
                        feature="Sentiment Drift"
                        blurb="Watch how the tone of AI answers about you shifts week over week, and get alerted when it moves. Available on Starter and above."
                        plan={ent.plan}
                    />
                </main>
            </div>
        );
    }

    let history: Row[] = [];
    try {
        history = (await loadDriftHistory(ctx.workspaceId)) as Row[];
    } catch (err) {
        console.warn('[drift] history load failed (migration 020 not applied?):', err);
    }
    const grouped = groupByPromptPlatform(history);
    const alerts  = grouped
        .map(g => ({ ...g, drift: computeLatestDrift(g.rows) }))
        .filter(g => g.drift && Math.abs(g.drift.delta) >= DRIFT_THRESHOLD)
        .sort((a, b) => Math.abs(b.drift!.delta) - Math.abs(a.drift!.delta));

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="Sentiment Drift"
                description={`Every scan carries a −1 to +1 sentiment score. We snapshot the weekly average per prompt + platform and surface swings of ${DRIFT_THRESHOLD.toFixed(2)} or more.`}
            />
            <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">

                {alerts.length === 0 ? (
                    <EmptyState hasHistory={history.length > 0} />
                ) : (
                    <section className="mb-10">
                        <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--text-ghost)] mb-4">
                            Active drift ({alerts.length})
                        </h2>
                        <div className="grid gap-4">
                            {alerts.map(a => (
                                <DriftCard key={a.key} group={a} />
                            ))}
                        </div>
                    </section>
                )}

                {grouped.length > 0 && (
                    <section>
                        <h2 className="text-sm font-medium uppercase tracking-widest text-[var(--text-ghost)] mb-4">
                            All tracked prompts ({grouped.length})
                        </h2>
                        <div className="grid gap-3">
                            {grouped.map(g => <MiniRow key={g.key} group={g} />)}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function groupByPromptPlatform(rows: Row[]) {
    const map = new Map<string, { key: string; prompt: string; platform: string; rows: Row[] }>();
    for (const r of rows) {
        const key = `${r.prompt}|${r.platform}`;
        const existing = map.get(key);
        if (existing) existing.rows.push(r);
        else map.set(key, { key, prompt: r.prompt, platform: r.platform, rows: [r] });
    }
    for (const g of map.values()) g.rows.sort((a, b) => a.week_start.localeCompare(b.week_start));
    return Array.from(map.values());
}

function computeLatestDrift(rows: Row[]): { current: number; prior: number; delta: number } | null {
    if (rows.length < 2) return null;
    const current = rows[rows.length - 1];
    const prior   = rows[rows.length - 2];
    return {
        current: Number(current.avg_sentiment),
        prior:   Number(prior.avg_sentiment),
        delta:   Number(current.avg_sentiment) - Number(prior.avg_sentiment),
    };
}

function DriftCard({ group }: { group: { prompt: string; platform: string; rows: Row[]; drift: { current: number; prior: number; delta: number } | null } }) {
    const d = group.drift!;
    const up = d.delta > 0;
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-start justify-between gap-6 mb-4">
                <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-widest text-[var(--text-ghost)] mb-1">
                        {PLATFORM_LABEL[group.platform] ?? group.platform}
                    </div>
                    <div className="text-base font-medium text-[var(--text-primary)] truncate">
                        &ldquo;{group.prompt}&rdquo;
                    </div>
                </div>
                <div
                    className="flex items-center gap-2 text-2xl font-medium tabular-nums"
                    style={{ color: up ? 'var(--data-green)' : 'var(--data-red)' }}
                >
                    {up ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                    {up ? '+' : ''}{d.delta.toFixed(2)}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
                <StatBlock label="Last week" value={d.prior.toFixed(2)} />
                <StatBlock label="This week" value={d.current.toFixed(2)} />
                <StatBlock label="Scans" value={String(group.rows[group.rows.length - 1].sample_size)} />
            </div>
            <div className="mt-5 pt-5 border-t border-[var(--border)]">
                <Sparkline points={group.rows.map(r => Number(r.avg_sentiment))} />
            </div>
            <div className="mt-4 flex justify-end">
                <Link
                    href={`/dashboard/llm-tracker?prompt=${encodeURIComponent(group.prompt)}`}
                    className="inline-flex items-center gap-1 text-sm text-[var(--accent-base)] hover:opacity-80"
                >
                    See the receipts <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}

function MiniRow({ group }: { group: { prompt: string; platform: string; rows: Row[] } }) {
    const latest = group.rows[group.rows.length - 1];
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 flex items-center gap-4">
            <div className="text-xs uppercase tracking-widest text-[var(--text-ghost)] w-32 shrink-0">
                {PLATFORM_LABEL[group.platform] ?? group.platform}
            </div>
            <div className="flex-1 min-w-0 text-sm text-[var(--text-primary)] truncate">
                {group.prompt}
            </div>
            <div className="w-24">
                <Sparkline points={group.rows.map(r => Number(r.avg_sentiment))} small />
            </div>
            <div className="text-sm font-medium tabular-nums text-[var(--text-primary)] w-16 text-right">
                {Number(latest.avg_sentiment).toFixed(2)}
            </div>
        </div>
    );
}

function StatBlock({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs uppercase tracking-widest text-[var(--text-ghost)] mb-1">{label}</div>
            <div className="text-lg font-medium tabular-nums text-[var(--text-primary)]">{value}</div>
        </div>
    );
}

function Sparkline({ points, small = false }: { points: number[]; small?: boolean }) {
    if (points.length < 2) {
        return (
            <div className="flex items-center gap-2 text-xs text-[var(--text-ghost)]">
                <Minus className="h-3 w-3" /> Not enough data
            </div>
        );
    }
    const w = small ? 96 : 800;
    const h = small ? 24 : 60;
    const min = Math.min(-1, ...points);
    const max = Math.max( 1, ...points);
    const range = max - min || 1;
    const xs = points.map((_, i) => (i / (points.length - 1)) * w);
    const ys = points.map(v => h - ((v - min) / range) * h);
    const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
            <path d={d} fill="none" stroke="var(--accent-base)" strokeWidth={small ? 1.5 : 2} />
            {!small && (
                <line x1={0} x2={w} y1={h - ((0 - min) / range) * h} y2={h - ((0 - min) / range) * h}
                      stroke="var(--border)" strokeDasharray="2 3" />
            )}
        </svg>
    );
}

function EmptyState({ hasHistory }: { hasHistory: boolean }) {
    return (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {hasHistory ? 'No drift this week' : 'Waiting for two weeks of scans'}
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                {hasHistory
                    ? 'Every tracked prompt is holding sentiment within ' + DRIFT_THRESHOLD.toFixed(2) + '. We\'ll alert you the moment one breaks.'
                    : 'Drift compares this week\'s average sentiment against last week\'s. Once two weekly snapshots exist per prompt, this page comes alive.'}
            </p>
        </div>
    );
}
