"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeeklyDecisionInbox, WeeklyDecisionItem } from "@/lib/weekly-inbox";

type InboxPayload = WeeklyDecisionInbox & { memberNames: Record<string, string> };

export function WeeklyDecisionInbox() {
  const [data, setData] = useState<InboxPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/decision-inbox", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Failed to load this week’s changes.");
      setData(body); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Failed to load this week’s changes."); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return <section aria-labelledby="weekly-inbox-title" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-1 text-[10px] uppercase tracking-[.16em] text-[var(--text-tertiary)]">Weekly decision inbox</div><h2 id="weekly-inbox-title" className="text-base font-medium text-[var(--text-primary)]">What changed enough to act on</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Only changes with at least four samples in both weeks and non-overlapping 95% confidence ranges appear here.</p></div><Link href="/dashboard/interventions"><Button variant="outline" size="sm">Open Actions <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></Link></div>
    {error ? <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,.2)] p-3 text-sm text-[var(--data-red)]"><span>{error}</span><Button variant="ghost" size="sm" onClick={() => void load()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry</Button></div>
      : !data ? <div className="mt-4 h-24 animate-pulse rounded-lg bg-[var(--bg-raised)]" />
      : data.items.length === 0 ? <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--data-green)]" /><div><div className="text-sm font-medium text-[var(--text-primary)]">No confidence-qualified change this week</div><p className="mt-1 text-xs text-[var(--text-secondary)]">This does not mean “no change.” It means the evidence is not strong enough to call one yet.</p></div></div>
      : <div className="mt-4 grid gap-3 lg:grid-cols-2">{data.items.slice(0, 6).map(item => <Decision key={item.id} item={item} ownerName={item.action?.ownerId ? data.memberNames[item.action.ownerId] : undefined} />)}</div>}
  </section>;
}

function Decision({ item, ownerName }: { item: WeeklyDecisionItem; ownerName?: string }) {
  const up = item.direction === "improved";
  return <article className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">{item.engine}</span><span className={up ? "text-[var(--data-green)]" : "text-[var(--data-red)]"}>{up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}</span></div><h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">{item.prompt}</h3><div className="mt-3 flex flex-wrap items-baseline gap-2"><span className={up ? "text-2xl tabular-nums text-[var(--data-green)]" : "text-2xl tabular-nums text-[var(--data-red)]"}>{item.changePoints > 0 ? "+" : ""}{item.changePoints} pts</span><span className="text-[11px] text-[var(--text-tertiary)]">{Math.round((item.previous.mentionRate ?? 0) * 100)}% → {Math.round((item.current.mentionRate ?? 0) * 100)}% · n={item.previous.sampleCount}/{item.current.sampleCount}</span></div><p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{item.whyItMatters}</p><div className="mt-3 text-[11px] text-[var(--text-tertiary)]">{item.action ? <>Next: <Link className="text-[var(--accent-base)] hover:underline" href="/dashboard/interventions">{item.action.title}</Link>{ownerName ? ` · ${ownerName}` : " · unassigned"}</> : <>Next: <Link className="text-[var(--accent-base)] hover:underline" href="/dashboard/interventions">review and assign an action</Link></>}</div></article>;
}
