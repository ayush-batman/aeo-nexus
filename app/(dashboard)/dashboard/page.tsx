"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, FileText, MessageSquare, Radio, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/dashboard/header";
import { useDashboardBootstrap } from "@/components/onboarding-check";
import { ScanReceiptDrawer } from "@/components/dashboard/scan-receipt-drawer";
import { WeeklyDecisionInbox } from "@/components/dashboard/weekly-decision-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { useWorkspaceLive } from "@/hooks/use-workspace-live";

interface DashboardStats {
    aeoHealthScore: number | null;
    aeoScoreChange: number | null;
    llmVisibility: number | null;
    llmVisibilityChange: number | null;
    llmVisibilitySamples: number;
    llmVisibilityMentions: number;
    llmVisibilityConfidence: "none" | "low" | "medium" | "high";
    forumThreadCount: number | null;
    highPriorityThreads: number | null;
    shareOfVoice: number | null;
    shareOfVoiceChange: number | null;
    contentScore: number | null;
    pagesNeedingOptimization: number | null;
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
    mentionCount?: number;
}

interface DashboardData {
    status: "complete" | "partial";
    partialReasons: string[];
    stats: DashboardStats;
    recentMentions: RecentMention[];
    visibilityMetrics: VisibilityMetric[];
    topThreads: ForumThread[];
}

const EMPTY_STATS: DashboardStats = {
    aeoHealthScore: null,
    aeoScoreChange: null,
    llmVisibility: null,
    llmVisibilityChange: null,
    llmVisibilitySamples: 0,
    llmVisibilityMentions: 0,
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
    const bootstrap = useDashboardBootstrap();
    const workspaceId = bootstrap?.workspaceId;
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [receipt, setReceipt] = useState<{ title: string; subtitle: string } | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const workspaceQuery = workspaceId
                ? `?workspaceId=${encodeURIComponent(workspaceId)}`
                : "";
            const statsRes = await fetch(`/api/dashboard/stats${workspaceQuery}`, { cache: "no-store" });
            if (!statsRes.ok) throw new Error("The measurement summary could not be loaded.");
            setData(await statsRes.json());
        } catch (reason) {
            console.error("Error fetching dashboard data:", reason);
            setError(reason instanceof Error ? reason.message : "The overview could not be loaded.");
        }
    }, [workspaceId]);

    const realtimeReady = useWorkspaceLive(() => void fetchData());

    useEffect(() => {
        let mounted = true;
        async function initialFetch() {
            setLoading(true);
            await fetchData();
            if (mounted) setLoading(false);
        }
        void initialFetch();

        return () => {
            mounted = false;
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
    const threads = data?.topThreads ?? [];
    const metrics = ENGINE_ORDER.map((engine) =>
        data?.visibilityMetrics?.find((metric) => metric.platform.toLowerCase() === engine) ?? {
            platform: engine, score: null, change: null, scanCount: 0,
        },
    );
    const hasMeasuredVisibility = stats.llmVisibility !== null && stats.llmVisibilitySamples > 0;
    const missedMentions = stats.llmVisibilitySamples - stats.llmVisibilityMentions;
    const visibilityFinding = stats.llmVisibilityMentions === missedMentions
        ? ["Answers split", "evenly."]
        : stats.llmVisibilityMentions < missedMentions
            ? ["Most answers", "leave you out."]
            : ["More answers", "mention you."];

    return <>
        <Header title="Overview" description="Measurement, evidence, and the next decision" />
        <main className="mx-auto max-w-[1440px] space-y-16 px-5 py-10 sm:px-8 lg:px-16 lg:py-12">
            {data?.status === "partial" && <div role="status" className="rounded-lg border border-[var(--data-amber)]/30 bg-[var(--data-amber-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">Some supporting evidence is incomplete. Aelo has withheld affected scores instead of estimating them.</div>}
            <section aria-labelledby="visibility-title" className="grid items-center gap-12 py-2 lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:pb-12">
                <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Current visibility brief</p>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--text-tertiary)]"><Radio className={realtimeReady ? "h-3.5 w-3.5 text-[var(--data-green)]" : "h-3.5 w-3.5"} />{realtimeReady ? "Auto-refresh connected" : "Refreshes after new scans"}</div>
                    </div>
                    <h2 id="visibility-title" className="mt-8 text-[clamp(3.25rem,6vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.065em] text-[var(--text-primary)]">
                        {hasMeasuredVisibility
                            ? <>{visibilityFinding[0]}<br /><span className="text-[var(--text-secondary)]">{visibilityFinding[1]}</span></>
                            : <>Your visibility<br /><span className="text-[var(--text-secondary)]">is unmeasured.</span></>}
                    </h2>
                    <p className="mt-7 max-w-xl text-[17px] leading-7 text-[var(--text-secondary)]">
                        {hasMeasuredVisibility
                            ? <>Your brand appeared in <strong className="font-medium text-[var(--text-primary)]">{stats.llmVisibilityMentions} of {stats.llmVisibilitySamples} completed answers.</strong> Failed runs stay out of the percentage and remain visible in the receipts.</>
                            : "Run a multi-sample scan to measure how often AI answers mention your brand. Missing evidence is never turned into a zero."}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-5">
                        <Link href="/dashboard/llm-tracker"><Button>See the missing mentions <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                        <button type="button" onClick={() => setReceipt({ title: `Visibility evidence · ${stats.llmVisibility === null ? "unmeasured" : `${stats.llmVisibility}%`}`, subtitle: "Every provider response behind this number, including model, region, sample, citation evidence, and failures." })} className="min-h-11 text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-active)] underline-offset-4 hover:decoration-[var(--accent-base)]">Open audit trail ↗</button>
                    </div>
                    <p className="mt-5 font-mono text-[11px] leading-5 text-[var(--text-tertiary)]">{metrics.filter((item) => item.scanCount > 0).length}/4 engines · n={stats.llmVisibilitySamples} completed samples · {confidenceCopy(stats.llmVisibilityConfidence).toLowerCase()}</p>
                </div>

                <div className="relative before:absolute before:inset-[10px_-10px_-10px_10px] before:-z-10 before:border before:border-[var(--border-default)]">
                    <div className="bg-[var(--bg-evidence)] p-7 text-[var(--text-evidence)] sm:p-8">
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-evidence)] pb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#667273]"><span>Measurement receipt</span><span>{stats.llmVisibilitySamples ? `n=${stats.llmVisibilitySamples}` : "No samples"}</span></div>
                        <p className="mt-6 text-xl font-semibold leading-7 tracking-[-0.025em]">How often do AI assistants include your brand in buyer answers?</p>
                        <div className="mt-6 border-y border-[var(--border-evidence)] py-6">
                            <div className="flex items-end justify-between gap-5"><span className="text-sm text-[#5F6B6C]">Measured mention rate</span><strong className="text-5xl font-medium tracking-[-0.055em]">{stats.llmVisibility === null ? "—" : `${stats.llmVisibility}%`}</strong></div>
                            <p className="mt-4 text-sm leading-6 text-[#5F6B6C]">{hasMeasuredVisibility ? `${stats.llmVisibilityMentions} mentions across ${stats.llmVisibilitySamples} usable provider answers.` : "There is not enough completed evidence to calculate this rate."}</p>
                        </div>
                        <div className="mt-5 flex items-start justify-between gap-5 text-xs leading-5 text-[#526D95]"><span>{confidenceCopy(stats.llmVisibilityConfidence)} · {metrics.filter((item) => item.scanCount > 0).length} engines responding</span><button type="button" onClick={() => setReceipt({ title: "Measurement receipt", subtitle: "Inspect the provider model, prompt, region, evidence, and persistence status for every sample." })} className="min-h-10 shrink-0 font-medium underline underline-offset-4">Inspect ↗</button></div>
                    </div>
                </div>
            </section>

            <section aria-labelledby="engine-evidence-title">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div><h2 id="engine-evidence-title" className="text-2xl font-medium text-[var(--text-primary)]">Visibility, by engine</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Share of completed answers that mention your brand.</p></div>
                    <Link href="/dashboard/llm-tracker" className="min-h-11 py-3 text-sm text-[var(--text-primary)] underline decoration-[var(--border-active)] underline-offset-4 hover:decoration-[var(--accent-base)]">Run another scan ↗</Link>
                </div>
                <div className="grid border-t border-[var(--border-default)] sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric) => <EnginePanel key={metric.platform} metric={metric} />)}</div>
                <p className="mt-5 flex items-start gap-2 font-mono text-[11px] leading-5 text-[var(--text-tertiary)]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />Scores compare only when prompt, model, region, mode, and scoring version match.</p>
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
                        <SupportingMetric label="Source opportunities" value={stats.forumThreadCount === null ? "—" : stats.forumThreadCount.toString()} detail={stats.highPriorityThreads === null ? "Partial evidence" : `${stats.highPriorityThreads} high priority`} />
                        <SupportingMetric label="Content readiness" value={stats.contentScore === null ? "—" : stats.contentScore.toString()} detail={stats.pagesNeedingOptimization === null ? "Partial evidence" : stats.pagesNeedingOptimization ? `${stats.pagesNeedingOptimization} pages to review` : "No flagged pages"} />
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

function EnginePanel({ metric }: { metric: VisibilityMetric }) {
    return <div className="border-b border-[var(--border-default)] py-6 sm:px-6 sm:odd:border-r lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
        <div className="flex items-center gap-2.5"><span className={metric.scanCount > 0 ? "h-1.5 w-1.5 rounded-full bg-[var(--accent-base)]" : "h-1.5 w-1.5 rounded-full bg-[var(--text-ghost)]"} /><span className="text-sm text-[var(--text-primary)]">{formatEngine(metric.platform)}</span></div>
        <div className="mt-5 text-4xl font-normal tracking-[-0.045em] text-[var(--text-primary)]">{metric.score === null ? "—" : `${metric.score}%`}<span className="ml-2 font-mono text-[11px] tracking-normal text-[var(--text-tertiary)]">n={metric.scanCount}</span></div>
        <div className="relative mt-5 h-5 before:absolute before:inset-x-0 before:top-2.5 before:h-px before:bg-[var(--border-default)]"><span className="absolute top-[7px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-[var(--accent-base)]" style={{ left: `${metric.score ?? 0}%` }} /></div>
        <p className="mt-2 font-mono text-[11px] text-[var(--text-tertiary)]">{metric.mentionCount ?? 0} mentioned · {metric.scanCount - (metric.mentionCount ?? 0)} missed</p>
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
