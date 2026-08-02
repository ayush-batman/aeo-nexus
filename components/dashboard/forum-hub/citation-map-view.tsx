"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, MapPin, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationMapViewProps {
    // Optional callback wired by the parent Forum Hub, clicking
    // 'Find threads on this source' jumps to Discover with the platform
    // pre-filtered. Closes the loop from insight to action.
    onJumpToDiscover?: (platform: string) => void;
}

interface SourceRow {
    domain:          string;
    displayName:     string;
    tier:            1 | 2 | 3;
    totalCitations:  number;
    distinctScans:   number;
    scanCoveragePct: number;
    isOwnDomain:     boolean;
    platformCounts:  Record<string, number>;
    subSources:      { sub: string; count: number }[];
    exampleUrls:     string[];
    strategyNote:    string | null;
}

interface Payload {
    totalScansAnalyzed: number;
    totalScansAll:      number;
    uniqueDomains:      number;
    sources:            SourceRow[];
}

// Citation Map, the strategic answer to "where do the LLMs actually source
// their answers for MY category?" Reads llm_scans.citations aggregated across
// all scans for the workspace and ranks source domains by coverage.
//
// Sage rule: numbers come from the customer's own scans, not our opinions
// about where they should be posting.
export function CitationMapView({ onJumpToDiscover }: CitationMapViewProps = {}) {
    const [data, setData]     = useState<Payload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/forum/citation-map', { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                setData(json);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md border border-[var(--data-red)]/25 bg-[var(--data-red-muted)] p-4 text-sm text-[var(--data-red)]">
                Couldn&apos;t load the citation map: {error}
            </div>
        );
    }

    if (!data || data.sources.length === 0) {
        return <EmptyState scansAll={data?.totalScansAll ?? 0} />;
    }

    return (
        <div className="space-y-6">
            {/* Sage header explanation */}
            <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 mt-0.5 text-[var(--accent-base)] flex-shrink-0" />
                    <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            Where the LLMs source your answers
                        </div>
                        <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                            Every source below was cited by an LLM in one of your{" "}
                            <span className="font-mono text-[var(--text-primary)]">{data.totalScansAnalyzed}</span> scans with returned citations
                            (out of <span className="font-mono">{data.totalScansAll}</span>&nbsp;total). Aelo doesn&apos;t
                            recommend from a generic playbook, this is the ground truth from your
                            own workspace. Focus your effort on the top-tier sources first.
                        </p>
                    </div>
                </div>
            </div>

            {/* Ranking */}
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
                <div className="grid grid-cols-[48px_1.6fr_0.7fr_0.9fr_0.9fr] items-center gap-3 px-4 py-3 border-b border-[var(--border-default)] text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    <div>Rank</div>
                    <div>Source</div>
                    <div>Tier</div>
                    <div className="text-right">Coverage</div>
                    <div className="text-right">Cites</div>
                </div>
                {data.sources.map((src, i) => (
                    <SourceRow
                        key={src.domain}
                        src={src}
                        rank={i + 1}
                        expanded={expanded.has(src.domain)}
                        onToggle={() => {
                            setExpanded(prev => {
                                const next = new Set(prev);
                                if (next.has(src.domain)) next.delete(src.domain);
                                else next.add(src.domain);
                                return next;
                            });
                        }}
                        onJumpToDiscover={onJumpToDiscover}
                    />
                ))}
            </div>

            <p className="text-center text-[11px] font-mono text-[var(--text-tertiary)]">
                Tier = coverage tier for YOUR workspace only · Click any source for sub-sources + example URLs
            </p>
        </div>
    );
}

// Maps domain → discover platform key so the "Find threads" link jumps to
// the right filter in Discover. Only sources with a valid platform filter
// in Discover show the action button; the rest just show the strategy note.
const DISCOVER_PLATFORM_MAP: Record<string, string> = {
    'reddit.com':          'reddit',
    'youtube.com':         'youtube',
    'stackoverflow.com':   'stackoverflow',
    'stackexchange.com':   'stackoverflow',
    'news.ycombinator.com':'hackernews',
    'quora.com':           'quora',
    'g2.com':              'g2',
    'capterra.com':        'capterra',
    'trustradius.com':     'trustradius',
    'trustpilot.com':      'trustpilot',
    'softwareadvice.com':  'softwareadvice',
    'medium.com':          'medium',
    'dev.to':              'devto',
    'substack.com':        'substack',
    'producthunt.com':     'producthunt',
    'alternativeto.net':   'alternativeto',
    'github.com':          'github',
};

function SourceRow({
    src, rank, expanded, onToggle, onJumpToDiscover,
}: {
    src: SourceRow;
    rank: number;
    expanded: boolean;
    onToggle: () => void;
    onJumpToDiscover?: (platform: string) => void;
}) {
    const tierStyle: Record<1 | 2 | 3, string> = {
        1: 'text-[var(--accent-base)] border-[var(--accent-base)]/30 bg-[var(--accent-muted)]',
        2: 'text-[var(--data-teal)] border-[var(--data-teal)]/30 bg-[var(--data-teal-muted)]',
        3: 'text-[var(--text-tertiary)] border-[var(--border-default)] bg-[var(--bg-raised)]',
    };
    const tierLabel: Record<1 | 2 | 3, string> = { 1: 'Tier 1', 2: 'Tier 2', 3: 'Long tail' };

    return (
        <>
            <button
                onClick={onToggle}
                className="w-full grid grid-cols-[48px_1.6fr_0.7fr_0.9fr_0.9fr] items-center gap-3 px-4 py-3 border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-raised)]/40 transition-colors text-left"
            >
                <div className="text-[13px] font-mono text-[var(--text-tertiary)] tabular-nums">
                    {String(rank).padStart(2, '0')}
                </div>
                <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--text-primary)] truncate flex items-center gap-2">
                        {src.displayName}
                        {src.isOwnDomain && (
                            <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[var(--data-green)] border border-[var(--data-green)]/25 bg-[var(--data-green-muted)] px-1.5 py-0.5 rounded-sm">
                                Owned
                            </span>
                        )}
                    </div>
                    <div className="mt-0.5 text-[11px] font-mono text-[var(--text-tertiary)] truncate">
                        {src.domain}
                    </div>
                </div>
                <div>
                    <span className={cn(
                        "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.10em]",
                        tierStyle[src.tier],
                    )}>
                        {tierLabel[src.tier]}
                    </span>
                </div>
                <div className="text-right">
                    <div className="text-[14px] font-medium text-[var(--text-primary)] tabular-nums">
                        {src.scanCoveragePct}%
                    </div>
                    <div className="mt-1 h-0.5 w-full bg-[var(--bg-raised)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--accent-base)]"
                            style={{ width: `${src.scanCoveragePct}%` }}
                        />
                    </div>
                </div>
                <div className="text-right text-[13px] tabular-nums text-[var(--text-secondary)]">
                    {src.totalCitations}
                </div>
            </button>

            {expanded && (
                <div className="border-b border-[var(--border-default)]/50 bg-[var(--bg-raised)]/30 px-4 py-4 space-y-3">
                    {/* Strategy note, the actionable Sage layer */}
                    {src.strategyNote && (
                        <div className="rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/50 pl-3 pr-3 py-2.5">
                            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent-base)] mb-1">
                                What to do
                            </div>
                            <div className="text-[12.5px] text-[var(--text-primary)] leading-relaxed">
                                {src.strategyNote}
                            </div>
                        </div>
                    )}

                    {/* Per-platform breakdown */}
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-1.5">
                            Per-platform citations
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(src.platformCounts).map(([platform, count]) => (
                                <span
                                    key={platform}
                                    className="inline-flex items-center gap-1 rounded-sm border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.10em] text-[var(--text-secondary)]"
                                >
                                    {platform}
                                    <span className="text-[var(--accent-base)]">{count}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Sub-sources (r/india, r/CRM, etc.) */}
                    {src.subSources.length > 0 && (
                        <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-1.5">
                                Top sub-sources
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {src.subSources.map(sub => (
                                    <span
                                        key={sub.sub}
                                        className="inline-flex items-center gap-1 rounded-sm border border-[var(--accent-base)]/25 bg-[var(--accent-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent-base)]"
                                    >
                                        {sub.sub}
                                        <span className="opacity-60">({sub.count})</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Example URLs */}
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-1.5">
                            Example cited URLs
                        </div>
                        <div className="space-y-1">
                            {src.exampleUrls.slice(0, 3).map((url, i) => (
                                <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] truncate"
                                >
                                    <span className="truncate">{url}</span>
                                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Jump to Discover, closes insight → action loop */}
                    {onJumpToDiscover && DISCOVER_PLATFORM_MAP[src.domain] && (
                        <div className="pt-2 border-t border-[var(--border-default)]/50">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onJumpToDiscover(DISCOVER_PLATFORM_MAP[src.domain]);
                                }}
                                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent-base)] hover:text-[var(--accent-hover)] transition-colors"
                            >
                                Find recent threads on {src.displayName}
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

function EmptyState({ scansAll }: { scansAll: number }) {
    return (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)] flex items-center justify-center mb-3">
                <AlertCircle className="w-4 h-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
                No citations captured yet
            </div>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                {scansAll > 0
                    ? `Your ${scansAll} scan${scansAll === 1 ? '' : 's'} completed without any of the LLMs returning citations. This happens when Gemini answers from training data alone. Try a more specific "best X for Y" prompt in LLM Tracker to trigger grounded responses.`
                    : `You haven't run any scans yet in this workspace. Head to LLM Tracker to add a prompt and run your first scan, the citation map fills in automatically once the LLMs start returning source URLs.`
                }
            </p>
        </div>
    );
}
