"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useConvexAuth, useConvexConnectionState, useQuery } from "convex/react";
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, FileText, MessageSquare, Radio, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/dashboard/header";
import { useDashboardBootstrap } from "@/components/onboarding-check";
import { ScanReceiptDrawer } from "@/components/dashboard/scan-receipt-drawer";
import { WeeklyDecisionInbox } from "@/components/dashboard/weekly-decision-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { DashboardSkeleton } from "@/components/ui/skeleton";

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
    confidence?: {
        level: "none" | "low" | "medium" | "high";
        sampleCount: number;
        mentions: number;
        mentionRate: number | null;
        interval: { lower: number; upper: number; confidence: number; method: "wilson" } | null;
    };
}

interface FocalAnswer {
    id: string;
    platform: string;
    prompt: string;
    responseExcerpt: string;
    brandMentioned: boolean;
    citationCount: number;
    providerModel: string | null;
    sampleId: string | null;
    createdAt: string;
}

interface DashboardData {
    status: "complete" | "partial";
    partialReasons: string[];
    stats: DashboardStats;
    recentMentions: RecentMention[];
    focalAnswer: FocalAnswer | null;
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

export default function DashboardPage() {
    return <ErrorBoundary fallback={<DashboardQueryError />}><DashboardContent /></ErrorBoundary>;
}

function DashboardContent() {
    const bootstrap = useDashboardBootstrap();
    const workspaceId = bootstrap?.workspaceId;
    const [asOf] = useState(() => Date.now());
    const { isAuthenticated } = useConvexAuth();
    const connection = useConvexConnectionState();
    const data = useQuery(
        api.dashboard.summary,
        workspaceId ? { workspaceId, asOf } : "skip",
    ) as DashboardData | undefined;
    const [receipt, setReceipt] = useState<{ title: string; subtitle: string } | null>(null);
    const realtimeReady = Boolean(data && isAuthenticated && connection.isWebSocketConnected);

    if (!data) {
        return <><Header title="Overview" description="What AI says, what supports it, and what to inspect next" /><DashboardSkeleton /></>;
    }

    const stats = data.stats ?? EMPTY_STATS;
    const recentMentions = data.recentMentions ?? [];
    const threads = data.topThreads ?? [];
    const metrics = ENGINE_ORDER.map((engine) =>
        data.visibilityMetrics?.find((metric) => metric.platform.toLowerCase() === engine) ?? {
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
        <Header title="Overview" description="What AI says, what supports it, and what to inspect next" />
        <main className="mx-auto max-w-[1480px] space-y-20 px-5 py-10 sm:px-8 lg:px-14 lg:py-14">
            {data.status === "partial" && <div role="status" className="rounded-lg border border-[var(--data-amber)]/30 bg-[var(--data-amber-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">Some supporting evidence is incomplete. Aelo has withheld affected scores instead of estimating them.</div>}
            <section aria-labelledby="visibility-title" className="relative grid gap-12 border-b border-[var(--border-default)] pb-16 pt-1 lg:grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)] lg:gap-20 lg:pb-20">
                <div className="flex min-h-[520px] flex-col justify-between lg:sticky lg:top-28 lg:self-start">
                    <div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Current visibility brief</p>
                            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]"><Radio className={realtimeReady ? "h-3 w-3 text-[var(--data-green)]" : "h-3 w-3"} />{realtimeReady ? "Live evidence feed" : "Updates after each scan"}</div>
                        </div>
                    <h2 id="visibility-title" className="mt-10 max-w-2xl text-[clamp(3.65rem,6.4vw,6.6rem)] font-normal leading-[.92] tracking-[-0.072em] text-[var(--text-primary)]">
                        {hasMeasuredVisibility
                            ? <>{visibilityFinding[0]}<br /><span className="text-[var(--text-secondary)]">{visibilityFinding[1]}</span></>
                            : <>Your visibility<br /><span className="text-[var(--text-secondary)]">is unmeasured.</span></>}
                    </h2>
                    <p className="mt-8 max-w-[36rem] text-[17px] leading-7 text-[var(--text-secondary)]">
                        {hasMeasuredVisibility
                            ? <>Your brand appeared in <strong className="font-medium text-[var(--text-primary)]">{stats.llmVisibilityMentions} of {stats.llmVisibilitySamples} usable answers.</strong> The rest left you out. Failed runs stay visible, but never enter the percentage.</>
                            : "Ask the buyer questions that matter. Aelo samples each one across your AI engines, then shows the answers and uncertainty behind the score."}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-5">
                        <Link href="/dashboard/llm-tracker"><Button>{hasMeasuredVisibility ? "Find the missing mentions" : "Measure buyer prompts"}<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                        <button type="button" onClick={() => setReceipt({ title: `Visibility evidence · ${stats.llmVisibility === null ? "unmeasured" : `${stats.llmVisibility}%`}`, subtitle: "Every provider response behind this number, including model, region, sample, citation evidence, and failures." })} className="min-h-11 text-sm font-medium text-[var(--text-primary)] underline decoration-[var(--border-active)] underline-offset-4 hover:decoration-[var(--accent-base)]">Audit every sample ↗</button>
                    </div>
                    </div>
                    <dl className="mt-12 grid grid-cols-3 border-y border-[var(--border-default)] py-5">
                        <BriefDatum label="Answers" value={stats.llmVisibilitySamples ? String(stats.llmVisibilitySamples) : "—"} />
                        <BriefDatum label="Engines" value={`${metrics.filter((item) => item.scanCount > 0).length}/4`} />
                        <BriefDatum label="Confidence" value={stats.llmVisibilityConfidence === "none" ? "—" : stats.llmVisibilityConfidence} />
                    </dl>
                </div>

                <EvidenceAnswer answer={data.focalAnswer} onInspect={(answer) => setReceipt({
                    title: answer?.prompt ?? "No sampled answer yet",
                    subtitle: answer ? `${answer.platform} · ${formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}` : "Run a scan to create the first evidence receipt.",
                })} />
            </section>

            <section aria-labelledby="engine-evidence-title">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div><h2 id="engine-evidence-title" className="text-2xl font-medium text-[var(--text-primary)]">Visibility, by engine</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Share of completed answers that mention your brand.</p></div>
                    <Link href="/dashboard/llm-tracker" className="min-h-11 py-3 text-sm text-[var(--text-primary)] underline decoration-[var(--border-active)] underline-offset-4 hover:decoration-[var(--accent-base)]">Run another scan ↗</Link>
                </div>
                <div className="grid border-y border-[var(--border-default)] sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric, index) => <EnginePanel key={metric.platform} metric={metric} index={index} />)}</div>
                <p className="mt-5 flex items-start gap-2 font-mono text-[11px] leading-5 text-[var(--text-tertiary)]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />Scores compare only when prompt, model, region, mode, and scoring version match.</p>
            </section>

            {!hasMeasuredVisibility && (
                <section className="flex flex-col justify-between gap-5 border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)] p-5 sm:flex-row sm:items-center">
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

function DashboardQueryError() {
    return <>
        <Header title="Overview" description="What AI says, what supports it, and what to inspect next" />
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <div role="alert" className="flex max-w-2xl items-start gap-4 rounded-lg border border-[var(--data-red)]/25 bg-[var(--data-red-muted)] p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--data-red)]" />
                <div>
                    <h2 className="text-base font-medium text-[var(--text-primary)]">Measurement summary unavailable</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">No score has been substituted. Retry the live connection.</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
                </div>
            </div>
        </main>
    </>;
}

function BriefDatum({ label, value }: { label: string; value: string }) {
    return <div className="border-r border-[var(--border-default)] px-4 first:pl-0 last:border-r-0">
        <dt className="font-mono text-[9px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">{label}</dt>
        <dd className="mt-2 capitalize text-lg text-[var(--text-primary)]">{value}</dd>
    </div>;
}

function EvidenceAnswer({ answer, onInspect }: { answer: FocalAnswer | null; onInspect: (answer: FocalAnswer | null) => void }) {
    const answerCode = answer?.sampleId ?? (answer ? answer.id.slice(0, 12) : "awaiting-sample");
    return <div className="relative isolate self-center pt-7 sm:px-5 lg:pt-10">
        <div aria-hidden="true" className="absolute inset-x-10 bottom-[-14px] top-12 -z-20 border border-[var(--border-default)] bg-[var(--bg-raised)]" />
        <div aria-hidden="true" className="absolute inset-x-5 bottom-[-7px] top-9 -z-10 border border-[var(--border-default)] bg-[var(--bg-surface)]" />
        <article aria-label={answer ? `Sampled answer from ${answer.platform}` : "Sampled answer placeholder"} className="relative flex min-h-[500px] flex-col bg-[var(--bg-evidence)] px-6 py-7 text-[var(--text-evidence)] shadow-[0_18px_60px_rgba(0,0,0,.16)] sm:px-9 sm:py-9">
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[var(--accent-base)]" aria-hidden="true" />
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-evidence)] pb-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#5F6B68]">
                <span>{answer ? `${answer.platform} / sampled answer` : "Evidence sheet / waiting"}</span>
                <span>{answer ? formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true }) : "No completed samples"}</span>
            </div>
            {answer ? <>
                <p className="mt-8 max-w-[36rem] text-[clamp(1.3rem,2.2vw,1.7rem)] font-semibold leading-[1.25] tracking-[-0.035em]">{answer.prompt}</p>
                <blockquote className="mt-8 max-w-[39rem] whitespace-pre-line text-[15px] leading-7 text-[#3F4947]">{answer.responseExcerpt}</blockquote>
                <div className="mt-auto pt-8">
                    <div className="spectrum-rule mb-5" />
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className={answer.brandMentioned ? "text-sm font-medium text-[#356B57]" : "text-sm font-medium text-[#895345]"}>
                                {answer.brandMentioned ? "Your brand appears in this answer" : "Your brand is absent from this answer"}
                            </p>
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#586560]">{answer.citationCount} provider citation{answer.citationCount === 1 ? "" : "s"} · {answer.providerModel ?? "model not recorded"}</p>
                        </div>
                        <button type="button" onClick={() => onInspect(answer)} className="min-h-10 shrink-0 text-left text-xs font-semibold text-[#3D608C] underline decoration-[#A9BFDF] underline-offset-4 hover:decoration-[#3D608C]">Open full receipt ↗</button>
                    </div>
                    <p className="mt-5 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-[#586560]">{answerCode}</p>
                </div>
            </> : <div className="flex min-h-[360px] flex-1 flex-col justify-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#586560]">No answer to show yet</p>
                <p className="mt-5 max-w-md text-3xl font-medium leading-tight tracking-[-0.045em]">Your first scan will leave a readable trail.</p>
                <p className="mt-5 max-w-md text-sm leading-6 text-[#5F6B68]">Aelo will place one real provider answer here—with the prompt, model, citations, and whether your brand appeared. Nothing is invented for the empty state.</p>
            </div>}
            {!answer && <p className="mt-5 text-right font-mono text-[9px] uppercase tracking-[0.12em] text-[#586560]">{answerCode}</p>}
        </article>
        <p className="mt-7 px-1 text-xs leading-5 text-[var(--text-tertiary)]">One real answer from the measured set. Open the receipt before drawing a conclusion from a single sample.</p>
    </div>;
}

function EnginePanel({ metric, index }: { metric: VisibilityMetric; index: number }) {
    const interval = metric.confidence?.interval;
    const lower = interval ? Math.round(interval.lower * 100) : null;
    const upper = interval ? Math.round(interval.upper * 100) : null;
    return <div className="border-b border-[var(--border-default)] py-7 sm:px-6 sm:odd:border-r lg:border-b-0 lg:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
        <div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">0{index + 1}</span><span className={metric.scanCount > 0 ? "h-1.5 w-1.5 rounded-full bg-[var(--data-green)]" : "h-1.5 w-1.5 rounded-full bg-[var(--text-ghost)]"} /></div>
        <p className="mt-5 text-sm text-[var(--text-primary)]">{formatEngine(metric.platform)}</p>
        <div className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-normal tracking-[-0.05em] text-[var(--text-primary)]">{metric.score === null ? "—" : `${metric.score}%`}</span><span className="font-mono text-[10px] tracking-normal text-[var(--text-tertiary)]">{metric.scanCount ? `${metric.mentionCount ?? 0}/${metric.scanCount}` : "n=0"}</span></div>
        <div className="relative mt-6 h-5 before:absolute before:inset-x-0 before:top-2.5 before:h-px before:bg-[var(--border-default)]">
            {lower !== null && upper !== null && <span className="absolute top-[7px] h-[7px] bg-[var(--accent-muted)] ring-1 ring-[var(--accent-base)]/70" style={{ left: `${lower}%`, width: `${Math.max(upper - lower, 1)}%` }} />}
            {metric.score !== null && <span className="absolute top-[6px] h-[9px] w-[2px] -translate-x-1/2 bg-[var(--accent-base)]" style={{ left: `${metric.score}%` }} />}
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">{lower !== null && upper !== null ? `95% range ${lower}–${upper}%` : "Needs more samples"}</p>
    </div>;
}

function SupportingMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return <div className="min-h-28 bg-[var(--bg-surface)] p-4"><dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</dt><dd className="mt-3 text-2xl font-medium text-[var(--text-primary)]">{value}</dd><dd className="mt-1 text-xs text-[var(--text-tertiary)]">{detail}</dd></div>;
}

function EmptyPanel({ icon: Icon, title, action, href }: { icon: typeof Search; title: string; action: string; href: string }) {
    return <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center"><Icon className="h-5 w-5 text-[var(--text-ghost)]" /><p className="mt-3 text-sm text-[var(--text-secondary)]">{title}</p><Link href={href} className="mt-2 text-xs text-[var(--accent-base)] hover:underline">{action}</Link></div>;
}

function JourneyLink({ step, title, detail, href, icon: Icon }: { step: string; title: string; detail: string; href: string; icon: typeof Search }) {
    return <Link href={href} className="group flex min-h-20 items-center gap-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 transition-colors hover:border-[var(--border-active)] hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-base)]">
        <span className="text-[10px] text-[var(--text-tertiary)]">{step}</span><Icon className="h-4 w-4 text-[var(--text-tertiary)]" /><span className="min-w-0"><span className="block text-sm font-medium text-[var(--text-primary)]">{title}</span><span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">{detail}</span></span><ArrowRight aria-hidden="true" className="ml-auto h-4 w-4 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-base)]" />
    </Link>;
}
