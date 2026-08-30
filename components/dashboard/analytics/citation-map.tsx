"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowUpRight, CheckCircle2, Link2, Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CitationDomain {
    domain: string;
    urlCount: number;
    totalMentions: number;
    isOwnDomain: boolean;
    urls: string[];
}

interface CitationAnalysis {
    domains: CitationDomain[];
    totalCitations: number;
    ownDomainCitations: number;
    gaps: string[];
    topCitedUrls: { url: string; count: number; type: string }[];
}

export function CitationMap() {
    const [data, setData] = useState<CitationAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/analytics/citations", { cache: "no-store" });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.error || "Citation evidence could not be loaded.");
            setData({
                domains: body.domains ?? [],
                totalCitations: body.totalCitations ?? 0,
                ownDomainCitations: body.ownDomainCitations ?? 0,
                gaps: body.gaps ?? [],
                topCitedUrls: body.topCitedUrls ?? [],
            });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Citation evidence could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => void fetchData(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchData]);

    if (loading) {
        return <div className="flex min-h-72 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--accent-base)]" />Loading provider citations…
        </div>;
    }

    if (error) {
        return <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-[var(--data-red)]/25 bg-[var(--data-red-muted)] p-5">
            <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 h-4 w-4 text-[var(--data-red)]" /><div><h2 className="text-sm font-medium text-[var(--text-primary)]">Sources unavailable</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{error}</p></div></div>
            <Button variant="outline" size="sm" onClick={() => void fetchData()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry</Button>
        </div>;
    }

    if (!data || data.domains.length === 0) {
        return <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-6 text-center">
            <Search className="h-5 w-5 text-[var(--text-ghost)]" />
            <h2 className="mt-4 text-base font-medium text-[var(--text-primary)]">No provider citations measured yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">Run scans on engines that return structured citation evidence. Links found only in answer prose are not counted here.</p>
        </div>;
    }

    const ownRate = data.totalCitations > 0 ? Math.round((data.ownDomainCitations / data.totalCitations) * 100) : 0;
    const externalDomains = data.domains.filter((item) => !item.isOwnDomain);

    return <div id="citation-sources" className="scroll-mt-20 space-y-5">
        <section aria-labelledby="source-summary-title" className="overflow-hidden rounded-xl border border-[var(--border-active)] bg-[var(--bg-surface)]">
            <div className="grid sm:grid-cols-[1fr_auto]">
                <div className="p-5 sm:p-7">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--accent-base)]">Structured provider evidence only</p>
                    <h2 id="source-summary-title" className="mt-3 text-2xl font-medium tracking-tight text-[var(--text-primary)]">Where AI gets answers in your category</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Domains are ranked by the number of provider-backed citations observed in your scans. Open a row to inspect the exact URLs.</p>
                </div>
                <dl className="grid grid-cols-3 border-t border-[var(--border-default)] bg-[var(--bg-base)] sm:grid-cols-1 sm:border-l sm:border-t-0">
                    <SummaryMetric label="Citations" value={data.totalCitations.toString()} />
                    <SummaryMetric label="Domains" value={data.domains.length.toString()} />
                    <SummaryMetric label="Own-domain rate" value={`${ownRate}%`} />
                </dl>
            </div>
        </section>

        <section aria-labelledby="domain-table-title" className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="flex items-end justify-between gap-3 border-b border-[var(--border-default)] px-5 py-4">
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Evidence rail</p><h2 id="domain-table-title" className="mt-1 text-base font-medium text-[var(--text-primary)]">Cited domains</h2></div>
                <span className="text-xs text-[var(--text-tertiary)]">{externalDomains.length} external · {data.domains.length - externalDomains.length} owned</span>
            </div>
            <div className="divide-y divide-[var(--border-default)]">
                {data.domains.map((source, index) => {
                    const expanded = expandedDomain === source.domain;
                    return <article key={source.domain}>
                        <button type="button" aria-expanded={expanded} onClick={() => setExpandedDomain(expanded ? null : source.domain)} className="grid min-h-16 w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-base)] sm:grid-cols-[2rem_1fr_6rem_7rem]">
                            <span className="text-xs text-[var(--text-ghost)]">{String(index + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]">{source.domain}{source.isOwnDomain && <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--data-green)]">Owned</span>}</span>
                            <span className="hidden text-xs text-[var(--text-tertiary)] sm:block">{source.urlCount} URL{source.urlCount === 1 ? "" : "s"}</span>
                            <span className="text-right text-sm text-[var(--text-secondary)]">{source.totalMentions} citation{source.totalMentions === 1 ? "" : "s"}</span>
                        </button>
                        {expanded && <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-base)] px-5 py-3 sm:pl-[4.75rem]">
                            <div className="space-y-2">{source.urls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-base)]"><Link2 className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 truncate">{url}</span><ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0" /></a>)}</div>
                        </div>}
                    </article>;
                })}
            </div>
        </section>

        <section aria-labelledby="gap-title" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--accent-base)]" /><div><h2 id="gap-title" className="text-sm font-medium text-[var(--text-primary)]">Places to earn a mention</h2><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">These source types have not appeared in structured citation evidence yet. Treat them as research leads, not guaranteed ranking factors.</p></div></div>
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--border-default)] sm:grid-cols-2">
                {data.gaps.slice(0, 6).map((gap) => {
                    const [name, action] = gap.split(/,\s*/, 2);
                    return <div key={gap} className="bg-[var(--bg-raised)] p-4"><p className="text-sm font-medium text-[var(--text-primary)]">{name}</p><p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">{action || "Research an authentic contribution."}</p></div>;
                })}
            </div>
        </section>
    </div>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
    return <div className="min-w-32 border-[var(--border-default)] p-4 text-center sm:border-b sm:text-left sm:last:border-b-0"><dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</dt><dd className="mt-1 text-xl font-medium text-[var(--text-primary)]">{value}</dd></div>;
}
