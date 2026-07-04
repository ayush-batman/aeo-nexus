"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
    Activity,
    ArrowRight,
    ArrowUpRight,
    CheckCircle2,
    Circle,
    ClipboardList,
    Layers,
    Loader2,
    MessageSquare,
    Plus,
    Sparkles,
    Zap,
} from "lucide-react";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Types (shape mirrored from /api/interventions) ──────────────────────────
type ActionType =
    | "forum_reply" | "content_publish" | "content_update"
    | "schema_add" | "backlink_earned" | "llms_txt_update" | "other";

type Status = "planned" | "in_progress" | "completed" | "measured";

type Verdict = "improved" | "no_change" | "regressed";

interface ImpactSummary {
    visibility_change: number;
    position_change: number | null;
    verdict: Verdict;
    measured_at: string;
}

interface Intervention {
    id: string;
    workspace_id: string;
    action_type: ActionType;
    title: string;
    description: string | null;
    action_url: string | null;
    forum_thread_id: string | null;
    target_prompts: string[];
    status: Status;
    action_taken_at: string | null;
    baseline_snapshot: Record<string, unknown>;
    impact_snapshot: Record<string, unknown>;
    impact_summary: ImpactSummary | Record<string, never>;
    created_at: string;
    updated_at: string;
}

// ── Display metadata ────────────────────────────────────────────────────────
const ACTION_LABELS: Record<ActionType, string> = {
    forum_reply: "Forum reply",
    content_publish: "Content published",
    content_update: "Content updated",
    schema_add: "Schema added",
    backlink_earned: "Backlink earned",
    llms_txt_update: "llms.txt updated",
    other: "Other",
};

const STATUS_LABELS: Record<Status, string> = {
    planned: "Planned",
    in_progress: "In progress",
    completed: "Awaiting measure",
    measured: "Measured",
};

// ────────────────────────────────────────────────────────────────────────────
export default function InterventionsPage() {
    const [items, setItems] = useState<Intervention[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [measuring, setMeasuring] = useState<Set<string>>(new Set());

    const fetchAll = useCallback(async () => {
        try {
            setError(null);
            const r = await fetch("/api/interventions", { cache: "no-store" });
            if (!r.ok) throw new Error(`Failed to load (${r.status})`);
            const d = await r.json();
            setItems(d.interventions ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load");
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const measure = useCallback(async (id: string) => {
        setMeasuring(s => new Set(s).add(id));
        try {
            const r = await fetch(`/api/interventions/${id}/measure`, { method: "POST" });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                throw new Error(d.error ?? `Measure failed (${r.status})`);
            }
            await fetchAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Measure failed");
        } finally {
            setMeasuring(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }, [fetchAll]);

    // Roll-up counters (Sage: numbers first)
    const stats = useMemo(() => {
        const list = items ?? [];
        return {
            total: list.length,
            measured: list.filter(i => i.status === "measured").length,
            awaiting: list.filter(i => i.status === "completed").length,
            improved: list.filter(
                i => i.status === "measured" &&
                     (i.impact_summary as ImpactSummary)?.verdict === "improved",
            ).length,
        };
    }, [items]);

    return (
        <>
            <Header
                title="Interventions"
                description="Every action you take, and its proof."
            />

            <div className="p-6 space-y-6">
                {error && (
                    <div className="rounded-lg border border-[rgba(239,68,68,0.2)] bg-[var(--data-red-muted)] p-3 text-sm text-[var(--data-red)]">
                        {error}
                    </div>
                )}

                {/* ── STATS RAIL (Sage: dense number strip, tabular) ────── */}
                <StatsRail stats={stats} />

                {/* ── LIST ─────────────────────────────────────────────── */}
                {items === null ? (
                    <ListSkeleton />
                ) : items.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-3">
                        {items.map(i => (
                            <InterventionRow
                                key={i.id}
                                item={i}
                                isMeasuring={measuring.has(i.id)}
                                onMeasure={() => measure(i.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

// ── Stats rail ──────────────────────────────────────────────────────────────
function StatsRail({ stats }: { stats: { total: number; measured: number; awaiting: number; improved: number } }) {
    const cells: Array<{ label: string; value: number; note?: string; accent?: boolean }> = [
        { label: "Total", value: stats.total },
        { label: "Awaiting measure", value: stats.awaiting },
        { label: "Measured", value: stats.measured },
        { label: "Improved", value: stats.improved, accent: true },
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--border-default)]">
            {cells.map(c => (
                <div key={c.label} className="bg-[var(--bg-surface)] p-4">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        {c.label}
                    </div>
                    <div
                        className={cn(
                            "mt-1 text-3xl font-medium tabular-nums tracking-tight",
                            c.accent && stats.improved > 0
                                ? "text-[var(--accent-base)]"
                                : "text-[var(--text-primary)]",
                        )}
                    >
                        {c.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Row ─────────────────────────────────────────────────────────────────────
function InterventionRow({
    item, isMeasuring, onMeasure,
}: { item: Intervention; isMeasuring: boolean; onMeasure: () => void }) {
    const summary = (item.impact_summary as ImpactSummary) || null;
    const hasReceipt = item.status === "measured" && summary && typeof summary.visibility_change === "number";

    return (
        <div className="group relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--border-active)]">
            {/* Top row: type · title · timestamps · action */}
            <div className="flex items-start gap-4 p-4">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)]">
                    <TypeIcon type={item.action_type} />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                            {ACTION_LABELS[item.action_type]}
                        </span>
                        <StatusPill status={item.status} />
                    </div>
                    <div className="text-[15px] font-medium leading-snug text-[var(--text-primary)]">
                        {item.title}
                    </div>
                    {item.target_prompts.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-2">
                            {item.target_prompts.slice(0, 2).map(p => (
                                <code
                                    key={p}
                                    className="rounded border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
                                    title={p}
                                >
                                    {p.length > 72 ? p.slice(0, 72) + "…" : p}
                                </code>
                            ))}
                            {item.target_prompts.length > 2 && (
                                <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                                    +{item.target_prompts.length - 2} more
                                </span>
                            )}
                        </div>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-[var(--text-tertiary)]">
                        {item.action_taken_at && (
                            <span title={item.action_taken_at}>
                                acted {formatDistanceToNow(new Date(item.action_taken_at), { addSuffix: true })}
                            </span>
                        )}
                        {item.action_url && (
                            <a
                                href={item.action_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-[var(--text-secondary)]"
                            >
                                source <ArrowUpRight className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Right rail action */}
                <div className="flex-shrink-0">
                    {item.status === "completed" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onMeasure}
                            disabled={isMeasuring}
                            className="text-[12px]"
                        >
                            {isMeasuring ? (
                                <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Measuring…</>
                            ) : (
                                <>Measure impact <ArrowRight className="ml-1 h-3 w-3" /></>
                            )}
                        </Button>
                    )}
                    {item.status === "measured" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onMeasure}
                            disabled={isMeasuring}
                            className="text-[12px] text-[var(--text-tertiary)]"
                        >
                            {isMeasuring ? <Loader2 className="h-3 w-3 animate-spin" /> : "Re-measure"}
                        </Button>
                    )}
                </div>
            </div>

            {/* THE RECEIPT — the ONE Magician moment. Only when measured. */}
            {hasReceipt && summary && <Receipt summary={summary} />}
        </div>
    );
}

// ── The receipt ─────────────────────────────────────────────────────────────
function Receipt({ summary }: { summary: ImpactSummary }) {
    const positive = summary.verdict === "improved";
    const negative = summary.verdict === "regressed";

    const deltaLabel =
        summary.visibility_change > 0 ? `+${summary.visibility_change}` :
        summary.visibility_change < 0 ? `${summary.visibility_change}` : "±0";

    return (
        <div className="border-t border-[var(--border-subtle)] px-4 pb-4 pt-3">
            <div className="spectrum-rule mb-3" />
            <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        Receipt · Verdict {summary.verdict}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span
                            className={cn(
                                "receipt-reveal text-4xl font-semibold tabular-nums",
                                positive && "text-[var(--accent-base)]",
                                negative && "text-[var(--data-red)]",
                                !positive && !negative && "text-[var(--text-primary)]",
                            )}
                        >
                            {deltaLabel}
                        </span>
                        <span className="text-[13px] font-mono text-[var(--text-tertiary)]">
                            pts&nbsp;visibility
                        </span>
                        {summary.position_change !== null && summary.position_change !== 0 && (
                            <span className="ml-3 font-mono text-[12px] text-[var(--text-secondary)]">
                                position {summary.position_change > 0 ? "+" : ""}{summary.position_change}
                            </span>
                        )}
                    </div>
                </div>
                <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                    measured {formatDistanceToNow(new Date(summary.measured_at), { addSuffix: true })}
                </div>
            </div>
        </div>
    );
}

// ── Bits ────────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: Status }) {
    const map: Record<Status, string> = {
        planned:      "border-[var(--border-default)] bg-[var(--bg-raised)] text-[var(--text-tertiary)]",
        in_progress:  "border-[rgba(6,182,212,0.2)] bg-[var(--data-cyan-muted)] text-[var(--data-cyan)]",
        completed:    "border-[rgba(245,158,11,0.2)] bg-[var(--data-amber-muted)] text-[var(--data-amber)]",
        measured:     "border-[rgba(229,211,166,0.25)] bg-[var(--accent-muted)] text-[var(--accent-base)]",
    };
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
            map[status],
        )}>
            {status === "measured" && <CheckCircle2 className="h-2.5 w-2.5" />}
            {status === "completed" && <Circle className="h-2.5 w-2.5" />}
            {STATUS_LABELS[status]}
        </span>
    );
}

function TypeIcon({ type }: { type: ActionType }) {
    const cls = "h-4 w-4 text-[var(--text-secondary)]";
    switch (type) {
        case "forum_reply":   return <MessageSquare className={cls} />;
        case "content_publish":
        case "content_update": return <ClipboardList className={cls} />;
        case "schema_add":    return <Layers className={cls} />;
        case "backlink_earned": return <Zap className={cls} />;
        case "llms_txt_update": return <Sparkles className={cls} />;
        default:              return <Activity className={cls} />;
    }
}

function EmptyState() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>No interventions yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[14px] text-[var(--text-secondary)]">
                <p>
                    An <em className="not-italic text-[var(--text-primary)]">intervention</em> is any action
                    you take to move the AI answer — a forum reply, a page you published, a schema block
                    you added. Aelo captures the visibility just before you act, then re-measures it later
                    so you can see whether the action worked.
                </p>
                <p>
                    Interventions are auto-created when you mark a Forum Hub thread as posted, or when you
                    publish through Content Studio. You can also log one manually.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                    <Link href="/dashboard/forum-hub">
                        <Button variant="outline" size="sm">
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                            Go to Forum Hub
                        </Button>
                    </Link>
                    <Link href="/dashboard/content-studio">
                        <Button variant="outline" size="sm">
                            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
                            Go to Content Studio
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map(i => (
                <div key={i} className="h-24 animate-pulse rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
            ))}
        </div>
    );
}
