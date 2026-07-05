"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, ExternalLink, ChevronDown, ChevronUp, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Scan {
    id:                    string;
    platform:              string;
    prompt:                string;
    response:              string;
    brand_mentioned:       boolean;
    mention_position:      number | null;
    sentiment:             'positive' | 'neutral' | 'negative' | null;
    competitors_mentioned: string[] | null;
    citations:             { url: string; title: string; is_own_domain: boolean }[] | null;
    created_at:            string;
}

// Which platform to open in for "reproduce this" — deep-links you to the
// native chat UI so the client can paste the prompt and see the answer live.
const REPRODUCE_URLS: Record<string, string> = {
    chatgpt:            'https://chatgpt.com/',
    gemini:             'https://gemini.google.com/',
    claude:             'https://claude.ai/new',
    perplexity:         'https://www.perplexity.ai/',
    google_ai_overview: 'https://www.google.com/search',
};

const PLATFORM_LABEL: Record<string, string> = {
    chatgpt:            'ChatGPT',
    gemini:             'Gemini',
    claude:             'Claude',
    perplexity:         'Perplexity',
    google_ai_overview: 'AI Overview',
};

interface Props {
    open:          boolean;
    onOpenChange:  (open: boolean) => void;
    title:         string;
    subtitle?:     string;
    platform?:     string;       // filter to a single platform, or omit for all
    limit?:        number;
    // Override the data source. When omitted, uses /api/llm/scans (auth-only,
    // dashboard use). When provided, the drawer POSTs no headers and fetches
    // this URL — used by the public India Index for anonymized public receipts.
    dataSourceUrl?: string;
}

/**
 * "See the receipt" drawer — Sage-archetype trust affordance.
 * Every derived metric in Aelo should be one click from THIS view: the
 * raw prompt sent, the exact platform response received, timestamp,
 * position, and — critically — a Reproduce button that opens the same
 * platform's UI so the client can verify with their own eyes.
 */
export function ScanReceiptDrawer({
    open, onOpenChange, title, subtitle, platform, limit = 30, dataSourceUrl,
}: Props) {
    const [scans, setScans]         = useState<Scan[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [expanded, setExpanded]   = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                let url: string;
                if (dataSourceUrl) {
                    url = dataSourceUrl;
                } else {
                    const qs = new URLSearchParams({ limit: String(limit) });
                    if (platform) qs.set('platform', platform);
                    url = `/api/llm/scans?${qs}`;
                }
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error('Failed to load');
                const data = await res.json();
                if (!cancelled) setScans(data.scans || []);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, platform, limit, dataSourceUrl]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--border-default)]">
                    <DialogTitle className="text-lg font-medium text-[var(--text-primary)] flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--accent-base)]" />
                        {title}
                    </DialogTitle>
                    {subtitle && (
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
                    )}
                    <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)] mt-3">
                        {loading ? 'Loading receipts…' : `${scans.length} scan${scans.length === 1 ? '' : 's'} · zero fabricated`}
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {loading && (
                        <div className="flex items-center justify-center py-16 text-[var(--text-secondary)]">
                            <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                    )}

                    {error && !loading && (
                        <div className="rounded-md border border-[var(--data-red)]/25 bg-[var(--data-red-muted)] px-4 py-3 text-sm text-[var(--data-red)]">
                            Couldn&apos;t load receipts: {error}
                        </div>
                    )}

                    {!loading && !error && scans.length === 0 && (
                        <div className="text-center py-16 text-[var(--text-secondary)]">
                            <p className="text-sm">No scans yet for this metric.</p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-1">
                                Every number here is computed from real scans. When there aren&apos;t any, we show nothing — not a guess.
                            </p>
                        </div>
                    )}

                    {!loading && !error && scans.map(scan => (
                        <ScanRow
                            key={scan.id}
                            scan={scan}
                            expanded={expanded.has(scan.id)}
                            onToggle={() => {
                                setExpanded(prev => {
                                    const next = new Set(prev);
                                    if (next.has(scan.id)) next.delete(scan.id);
                                    else next.add(scan.id);
                                    return next;
                                });
                            }}
                        />
                    ))}
                </div>

                <div className="px-6 py-3 border-t border-[var(--border-default)] bg-[var(--bg-raised)]/40 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    LLM answers are non-deterministic — a single scan is a sample, not a truth. Aelo aggregates multiple prompts to reduce noise, but any single number can drift ±10 points between measurements. That&apos;s why the receipts are here: verify any claim yourself.
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ScanRow({ scan, expanded, onToggle }: { scan: Scan; expanded: boolean; onToggle: () => void }) {
    const [copied, setCopied] = useState(false);

    async function copyPrompt() {
        try {
            await navigator.clipboard.writeText(scan.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* clipboard blocked */ }
    }

    const reproduceUrl = REPRODUCE_URLS[scan.platform];

    return (
        <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-raised)]/40 transition-colors text-left"
            >
                <div className="flex flex-col items-start gap-1 min-w-[80px] flex-shrink-0">
                    <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                        {PLATFORM_LABEL[scan.platform] ?? scan.platform}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                        {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)] leading-snug">
                        {scan.prompt}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[10px] font-mono">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded-sm border tracking-[0.08em] uppercase",
                            scan.brand_mentioned
                                ? "border-[var(--data-green)]/30 bg-[var(--data-green-muted)] text-[var(--data-green)]"
                                : "border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-tertiary)]",
                        )}>
                            {scan.brand_mentioned ? "Mentioned" : "Not named"}
                        </span>
                        {scan.mention_position !== null && (
                            <span className="text-[var(--text-secondary)]">Pos #{scan.mention_position}</span>
                        )}
                        {scan.sentiment && scan.sentiment !== 'neutral' && (
                            <span className={cn(
                                "px-1.5 py-0.5 rounded-sm uppercase tracking-[0.08em]",
                                scan.sentiment === 'positive' && "text-[var(--data-green)]",
                                scan.sentiment === 'negative' && "text-[var(--data-red)]",
                            )}>
                                {scan.sentiment}
                            </span>
                        )}
                        {(scan.competitors_mentioned?.length ?? 0) > 0 && (
                            <span className="text-[var(--text-tertiary)]">
                                vs {scan.competitors_mentioned!.slice(0, 3).join(", ")}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex-shrink-0 pt-1">
                    {expanded
                        ? <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
                        : <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
                    }
                </div>
            </button>

            {expanded && (
                <div className="border-t border-[var(--border-default)] bg-[var(--bg-raised)]/30 px-4 py-4 space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                                Raw response
                            </span>
                        </div>
                        <pre className="text-[12px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-normal">
                            {scan.response}
                        </pre>
                    </div>

                    {(scan.citations?.length ?? 0) > 0 && (
                        <div>
                            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-1">
                                Citations ({scan.citations!.length})
                            </div>
                            <div className="space-y-1">
                                {scan.citations!.slice(0, 8).map((c, i) => (
                                    <a
                                        key={i}
                                        href={c.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                            "flex items-center gap-2 text-[12px] font-mono",
                                            c.is_own_domain
                                                ? "text-[var(--data-green)]"
                                                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                                        )}
                                    >
                                        <span className="truncate">{c.title || c.url}</span>
                                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        <Button variant="outline" size="sm" onClick={copyPrompt}>
                            {copied
                                ? <><CheckCircle className="w-3 h-3" /> Copied</>
                                : <><Copy className="w-3 h-3" /> Copy prompt</>
                            }
                        </Button>
                        {reproduceUrl && (
                            <a
                                href={reproduceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent-base)] hover:text-[var(--accent-hover)]"
                            >
                                Reproduce on {PLATFORM_LABEL[scan.platform]} <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
