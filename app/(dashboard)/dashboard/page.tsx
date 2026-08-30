"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, FileText, MessageSquare, Radio, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/dashboard/header";
import { ScanReceiptDrawer } from "@/components/dashboard/scan-receipt-drawer";
import { WeeklyDecisionInbox } from "@/components/dashboard/weekly-decision-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface DashboardStats {
    aeoHealthScore: number | null;
    aeoScoreChange: number | null;
    llmVisibility: number | null;
    llmVisibilityChange: number | null;
    llmVisibilitySamples: number;
    llmVisibilityConfidence: "none" | "low" | "medium" | "high";
    forumThreadCount: number;
    highPriorityThreads: number;
    shareOfVoice: number | null;
    shareOfVoiceChange: number | null;
    contentScore: number | null;
    pagesNeedingOptimization: number;
}

interface RecentMention {
    id: string;
    platform: string;
    prompt: string;
    sentiment: "positive" | "neutral" | "negative" | null;
    createdAt: string;
}

interface ForumThread {
    id: string;
    title: string;
    subreddit: string | null;
    opportunity_score: number;
    platform: string;
}

interface VisibilityMetric {
    platform: string;
    score: number | null;
    change: number | null;
    scanCount: number;
}

interface DashboardData {
    stats: DashboardStats;
    recentMentions: RecentMention[];
    visibilityMetrics: VisibilityMetric[];
}

const EMPTY_STATS: DashboardStats = {
    aeoHealthScore: null,
    aeoScoreChange: null,
    llmVisibility: null,
    llmVisibilityChange: null,
    llmVisibilitySamples: 0,
    llmVisibilityConfidence: "none",
    forumThreadCount: 0,
    highPriorityThreads: 0,
    shareOfVoice: null,
    shareOfVoiceChange: null,
    contentScore: null,
    pagesNeedingOptimization: 0,
};

const ENGINE_ORDER = ["chatgpt", "gemini", "claude", "perplexity"];

function formatEngine(platform: string) {
    return platform.toLowerCase() === "chatgpt"
        ? "ChatGPT"
        : platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
}

function confidenceCopy(confidence: DashboardStats["llmVisibilityConfidence"]) {
    if (confidence === "high") return "High confidence";
    if (confidence === "medium") return "Medium confidence";
    if (confidence === "low") return "Low confidence";
    return "Not enough evidence";
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [realtimeReady, setRealtimeReady] = useState(false);
    const [receipt, setReceipt] = useState<{ title: string; subtitle: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [statsRes, threadsRes] = await Promise.all([
                fetch("/api/dashboard/stats", { cache: "no-store" }),
                fetch("/api/forum/threads?limit=3&minScore=50", { cache: "no-store" }),
            ]);
            if (!statsRes.ok) throw new Error("The measurement summary could not be loaded.");
            setData(await statsRes.json());
            if (threadsRes.ok) {
                const body = await threadsRes.json();
                setThreads(body.threads || []);
            }
        } catch (reason) {
            console.error("Error fetching dashboard data:", reason);
            setError(reason instanceof Error ? reason.message : "The overview could not be loaded.");
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        async function initialFetch() {
            setLoading(true);
            await fetchData();
            if (mounted) setLoading(false);
        }
        void initialFetch();

        const supabase = createClient();
        const channel = supabase
            .channel("dashboard-measurement-updates")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "llm_scans" }, () => void fetchData())
            .on("postgres_changes", { event: "*", schema: "public", table: "forum_threads" }, () => void fetchData())
            .subscribe((status) => {
                if (mounted) setRealtimeReady(status === "SUBSCRIBED");
            });

        return () => {
            mounted = false;
            void supabase.removeChannel(channel);
        };
    }, [fetchData]);

    if (loading) {
        return <><Header title="Overview" description="Measurement, evidence, and the next decision" /><DashboardSkeleton /></>;
    }

    if (error) {
        return <>
            <Header title="Overview" description="Measurement, evidence, and the next decision" />
            <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                <div role="alert" className="flex max-w-2xl items-start gap-4 rounded-lg border border-[var(--data-red)]/25 bg-[var(--data-red-muted)] p-5">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--data-red)]" />
                    <div>
                        <h2 className="text-base font-medium text-[var(--text-primary)]">Measurement summary unavailable</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{error} No score has been substituted.</p>
                        <Button variant="outline" className="mt-4" onClick={() => void fetchData()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
                    </div>
                </div>
            </main>
        </>;
    }

    const stats = data?.stats ?? EMPTY_STATS;
    const recentMentions = data?.recentMentions ?? [];
    const metrics = ENGINE_ORDER.map((engine) =>
        data?.visibilityMetrics?.find((metric) => metric.platform.toLowerCase() === engine) ?? {
            platform: engine, score: null, change: null, scanCount: 0,
        },
    );
    const hasMeasuredVisibility = stats.llmVisibility !== null && stats.llmVisibilitySamples > 0;

    return <>
        <Header title="Overview" description="Measurement, evidence, and the next decision" />
        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section aria-labelledby="visibility-title" className="overflow-hidden rounded-xl border border-[var(--border-active)] bg-[var(--bg-surface)]">
                <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
                    <div className="p-5 sm:p-7 lg:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--accent-base)]">Defensible visibility</p>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                                <Radio className={realtimeReady ? "h-3.5 w-3.5 text-[var(--data-green)]" : "h-3.5 w-3.5"} />
                                {realtimeReady ? "Auto-refresh connected" : "Refreshes after new scans"}
                            </div>
                        </div>
                        <div className="mt-8 flex flex-wrap items-end gap-x-5 gap-y-3">
                            <h2 id="visibility-title" className="text-6xl font-medium tracking-[-0.06em] text-[var(--text-primary)] sm:text-7xl">
                                {stats.llmVisibility === null ? "—" : `${stats.llmVisibility}%`}
                            </h2>
                            {stats.llmVisibilityChange !== null && (
                                <span className={stats.llmVisibilityChange > 0 ? "mb-2 text-sm text-[var(--data-green)]" : stats.llmVisibilityChange < 0 ? "mb-2 text-sm text-[var(--data-red)]" : "mb-2 text-sm text-[var(--text-secondary)]"}>
                                    {stats.llmVisibilityChange > 0 ? "+" : ""}{stats.llmVisibilityChange} points vs matched baseline
                                </span>
                            )}
                        </div>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                            {hasMeasuredVisibility
                                ? "The share of successful AI answers that mention your brand. Failed runs are excluded and remain visible in the receipts."
                                : "Run a multi-sample scan to measure how often AI answers mention your brand. Missing evidence is never turned into a zero."}
                        </p>
                        <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--border-default)] sm:grid-cols-4">
                            <EvidenceCell label="Successful samples" value={stats.llmVisibilitySamples ? `n=${stats.llmVisibilitySamples}` : "—"} />
                            <EvidenceCell label="Confidence" value={confidenceCopy(stats.llmVisibilityConfidence)} />
                            <EvidenceCell label="Coverage" value={`${metrics.filter((item) => item.scanCount > 0).length}/4 engines`} />
                            <div className="bg-[var(--bg-raised)]">
                                <button type="button" onClick={() => setReceipt({
                                    title: `Visibility evidence · ${stats.llmVisibility === null ? "unmeasured" : `${stats.llmVisibility}%`}`,
                                    subtitle: "Every provider response behind this number, including model, region, sample, citation evidence, and failures.",
                                })} className="min-h-20 w-full p-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-base)]">
                                    <span className="block text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Audit trail</span>
                                    <span className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[var(--accent-base)]">Open receipts <ArrowRight className="h-3.5 w-3.5" /></span>
                                </button>
                            </div>
                        </dl>
                    </div>

                    <div className="border-t border-[var(--border-default)] bg-[var(--bg-base)] p-5 sm:p-7 lg:border-l lg:border-t-0">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Engine evidence</p>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">Same contract, shown separately</p>
                            </div>
                            <Link href="/dashboard/llm-tracker" className="text-xs font-medium text-[var(--accent-base)] hover:underline">Run scan</Link>
                        </div>
                        <div className="mt-5 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
                            {metrics.map((metric) => <EngineRow key={metric.platform} metric={metric} />)}
                        </div>
                        <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-[var(--text-tertiary)]">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Scores are comparable only when prompt, model, region, mode, and scoring version match.
                        </div>
                    </div>
                </div>
            </section>

            {!hasMeasuredVisibility && (
                <section className="flex flex-col justify-between gap-5 rounded-xl border border-[var(--accent-base)]/25 bg-[var(--accent-muted)] p-5 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--accent-base)]">Start here</p>
                        <h2 className="mt-2 text-lg font-medium text-[var(--text-primary)]">Measure 3–5 buyer prompts across your entitled engines</h2>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">Aelo samples each prompt more than once so the result can carry a confidence level.</p>
                    </div>
                    <Link href="/dashboard/llm-tracker"><Button>Set up prompts <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                </section>
            )}

            <WeeklyDecisionInbox />

            <section aria-labelledby="context-title" className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Evidence log</p>
                            <h2 id="context-title" className="mt-1 text-base font-medium text-[var(--text-primary)]">Recent measured answers</h2>
                        </div>
                        <Link href="/dashboard/llm-tracker" className="text-xs text-[var(--accent-base)] hover:underline">All receipts</Link>
                    </div>
                    {recentMentions.length > 0 ? (
                        <div className="divide-y divide-[var(--border-default)]">
                            {recentMentions.slice(0, 5).map((item) => (
                                <button key={item.id} type="button" onClick={() => setReceipt({ title: item.prompt, subtitle: `${formatEngine(item.platform)} · ${formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}` })} className="grid min-h-16 w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-base)]">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-[var(--text-primary)]">{item.prompt}</p>
                                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{formatEngine(item.platform)} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.sentiment && <Badge variant={item.sentiment === "positive" ? "success" : item.sentiment === "negative" ? "destructive" : "outline"}>{item.sentiment}</Badge>}
                                        <ExternalLink className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : <EmptyPanel icon={Search} title="No measured answers yet" action="Run first scan" href="/dashboard/llm-tracker" />}
                </div>

                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
                    <div className="border-b border-[var(--border-default)] px-5 py-4">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Supporting signals</p>
                        <h2 className="mt-1 text-base font-medium text-[var(--text-primary)]">Context, not the score</h2>
                    </div>
                    <dl className="grid grid-cols-2 gap-px bg-[var(--border-default)]">
                        <SupportingMetric label="Aelo health" value={stats.aeoHealthScore === null ? "—" : `${stats.aeoHealthScore}/100`} detail={stats.aeoScoreChange === null ? "No matched change" : `${stats.aeoScoreChange > 0 ? "+" : ""}${stats.aeoScoreChange} this week`} />
                        <SupportingMetric label="Share of voice" value={stats.shareOfVoice === null ? "—" : `${stats.shareOfVoice}%`} detail="Competitor mentions" />
                        <SupportingMetric label="Source opportunities" value={stats.forumThreadCount.toString()} detail={`${stats.highPriorityThreads} high priority`} />
                        <SupportingMetric label="Content readiness" value={stats.contentScore === null ? "—" : stats.contentScore.toString()} detail={stats.pagesNeedingOptimization ? `${stats.pagesNeedingOptimization} pages to review` : "No flagged pages"} />
                    </dl>
                    {threads.length > 0 ? <div className="border-t border-[var(--border-default)] p-5">
                        <div className="flex items-center justify-between"><p className="text-xs font-medium text-[var(--text-secondary)]">Highest source opportunity</p><Link href="/dashboard/forum-hub" className="text-xs text-[var(--accent-base)] hover:underline">View sources</Link></div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-primary)]">{threads[0].title}</p>
                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{threads[0].platform === "reddit" && threads[0].subreddit ? `r/${threads[0].subreddit}` : threads[0].platform} · opportunity {threads[0].opportunity_score}/100</p>
                    </div> : null}
                </div>
            </section>

            <nav aria-label="Next steps" className="grid gap-3 sm:grid-cols-3">
                <JourneyLink step="01" title="Prompts & scans" detail="Measure buyer questions" href="/dashboard/llm-tracker" icon={Search} />
                <JourneyLink step="02" title="Sources" detail="Find where AI gets answers" href="/dashboard/sources" icon={MessageSquare} />
                <JourneyLink step="03" title="Actions" detail="Assign the next intervention" href="/dashboard/interventions" icon={FileText} />
            </nav>
        </main>

        <ScanReceiptDrawer open={Boolean(receipt)} onOpenChange={(open) => { if (!open) setReceipt(null); }} title={receipt?.title ?? "Scans"} subtitle={receipt?.subtitle} />
    </>;
}

function EvidenceCell({ label, value }: { label: string; value: string }) {
    return <div className="min-h-20 bg-[var(--bg-raised)] p-3"><dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</dt><dd className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</dd></div>;
}

function EngineRow({ metric }: { metric: VisibilityMetric }) {
    return <div className="grid min-h-14 grid-cols-[1fr_auto_auto] items-center gap-4 py-3">
        <div className="flex items-center gap-2.5"><span className={metric.scanCount > 0 ? "h-1.5 w-1.5 rounded-full bg-[var(--data-green)]" : "h-1.5 w-1.5 rounded-full bg-[var(--text-ghost)]"} /><span className="text-sm text-[var(--text-primary)]">{formatEngine(metric.platform)}</span></div>
        <span className="text-xs text-[var(--text-tertiary)]">n={metric.scanCount}</span>
        <span className="w-12 text-right text-lg font-medium text-[var(--text-primary)]">{metric.score === null ? "—" : `${metric.score}%`}</span>
    </div>;
}

function SupportingMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return <div className="min-h-28 bg-[var(--bg-surface)] p-4"><dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</dt><dd className="mt-3 text-2xl font-medium text-[var(--text-primary)]">{value}</dd><p className="mt-1 text-xs text-[var(--text-tertiary)]">{detail}</p></div>;
}

function EmptyPanel({ icon: Icon, title, action, href }: { icon: typeof Search; title: string; action: string; href: string }) {
    return <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center"><Icon className="h-5 w-5 text-[var(--text-ghost)]" /><p className="mt-3 text-sm text-[var(--text-secondary)]">{title}</p><Link href={href} className="mt-2 text-xs text-[var(--accent-base)] hover:underline">{action}</Link></div>;
}

function JourneyLink({ step, title, detail, href, icon: Icon }: { step: string; title: string; detail: string; href: string; icon: typeof Search }) {
    return <Link href={href} className="group flex min-h-20 items-center gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 transition-colors hover:border-[var(--border-active)] hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-base)]">
        <span className="text-[10px] text-[var(--text-ghost)]">{step}</span><Icon className="h-4 w-4 text-[var(--text-tertiary)]" /><span className="min-w-0"><span className="block text-sm font-medium text-[var(--text-primary)]">{title}</span><span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">{detail}</span></span><ArrowRight className="ml-auto h-4 w-4 text-[var(--text-ghost)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-base)]" />
    </Link>;
}
