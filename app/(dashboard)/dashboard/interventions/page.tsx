"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, ArrowUpRight, CheckCircle2, Loader2, Plus, RefreshCw } from "lucide-react";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Insight } from "@/lib/insights";

type Status = "planned" | "in_progress" | "completed" | "measured";
type Priority = "high" | "medium" | "low";
type Member = { id: string; full_name: string | null; email: string };
type ActionEvent = { id: string; action_id: string; event_type: string; created_at: string };
type ImpactSummary = {
  visibility_change: number;
  position_change: number | null;
  verdict: "improved" | "no_change" | "regressed" | "inconclusive";
  measured_at: string;
  reason?: string;
  baseline_sample_count?: number;
  followup_sample_count?: number;
};
type TeamAction = {
  id: string;
  title: string;
  hypothesis: string | null;
  description: string | null;
  source_url: string | null;
  action_url: string | null;
  owner_id: string | null;
  priority: Priority;
  target_prompts: string[];
  target_engines: string[];
  status: Status;
  action_taken_at: string | null;
  impact_summary: ImpactSummary | Record<string, never>;
  created_at: string;
};
type Payload = {
  interventions: TeamAction[];
  suggestions: Insight[];
  events: ActionEvent[];
  members: Member[];
  currentUserId: string;
  canEdit: boolean;
};

const LANES: Array<{ status: Status; label: string; note: string }> = [
  { status: "planned", label: "Planned", note: "Ready to assign" },
  { status: "in_progress", label: "Doing", note: "Work underway" },
  { status: "completed", label: "Awaiting measure", note: "Shipped; needs a follow-up" },
  { status: "measured", label: "Measured", note: "Evidence attached" },
];
const NEXT_STATUS: Record<Status, Status | null> = {
  planned: "in_progress",
  in_progress: "completed",
  completed: null,
  measured: null,
};
const NEXT_LABEL: Record<Status, string> = {
  planned: "Start work",
  in_progress: "Mark shipped",
  completed: "Measure impact",
  measured: "Re-measure",
};

export default function ActionsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/interventions", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `Failed to load (${response.status})`);
      setData(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to load actions.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const mutate = useCallback(async (key: string, url: string, init: RequestInit) => {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(url, init);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The action could not be saved.");
      return false;
    } finally {
      setBusy(null);
    }
  }, [load]);

  const stats = useMemo(() => ({
    total: data?.interventions.length ?? 0,
    open: data?.interventions.filter(item => item.status !== "measured").length ?? 0,
    awaiting: data?.interventions.filter(item => item.status === "completed").length ?? 0,
    improved: data?.interventions.filter(item => (item.impact_summary as ImpactSummary).verdict === "improved").length ?? 0,
  }), [data]);

  return <>
    <Header title="Actions" description="Turn evidence into assigned work, then measure whether it helped." />
    <main className="space-y-6 p-4 sm:p-6">
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,.25)] bg-[var(--data-red-muted)] p-3 text-sm text-[var(--data-red)]">
        <span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Retry</Button>
      </div>}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--border-default)] md:grid-cols-4">
        {[['All actions', stats.total], ['Open', stats.open], ['Awaiting measure', stats.awaiting], ['Improved', stats.improved]].map(([label, value]) =>
          <div key={label} className="bg-[var(--bg-surface)] p-4"><div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div><div className="mt-1 text-3xl tabular-nums text-[var(--text-primary)]">{value}</div></div>
        )}
      </div>

      {data?.canEdit && <div className="flex justify-end"><Button variant="outline" onClick={() => setShowCreate(value => !value)}><Plus className="mr-1.5 h-4 w-4" />Log an action</Button></div>}
      {showCreate && data && <CreateActionForm members={data.members} currentUserId={data.currentUserId} busy={busy === "create"} onCancel={() => setShowCreate(false)} onSubmit={async body => {
        const saved = await mutate("create", "/api/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (saved) setShowCreate(false);
      }} />}

      {data && data.suggestions.length > 0 && <section aria-labelledby="suggestions-title" className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <div className="mb-4"><h2 id="suggestions-title" className="text-base font-medium text-[var(--text-primary)]">Suggested from your evidence</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Save a suggestion to make it shared, assignable, and measurable.</p></div>
        <div className="grid gap-3 lg:grid-cols-3">
          {data.suggestions.slice(0, 3).map(suggestion => <article key={suggestion.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest"><span className={priorityColor(suggestion.priority)}>{suggestion.priority}</span><span className="text-[var(--text-tertiary)]">{suggestion.category}</span></div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{suggestion.title}</h3><p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{suggestion.detail}</p>
            {data.canEdit && <Button className="mt-4 min-h-10 w-full" variant="outline" disabled={busy === suggestion.id} onClick={() => void mutate(suggestion.id, "/api/interventions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ insight_id: suggestion.id }) })}>{busy === suggestion.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}Add to Actions</Button>}
          </article>)}
        </div>
      </section>}

      {!data ? <BoardSkeleton /> : <section aria-label="Team action board" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LANES.map(lane => {
          const items = data.interventions.filter(item => item.status === lane.status);
          return <div key={lane.status} className="min-w-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/45 p-3">
            <div className="mb-3 flex items-start justify-between px-1"><div><h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-primary)]">{lane.label}</h2><p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{lane.note}</p></div><span className="text-xs tabular-nums text-[var(--text-tertiary)]">{items.length}</span></div>
            <div className="space-y-3">{items.map(item => <ActionCard key={item.id} item={item} members={data.members} events={data.events.filter(event => event.action_id === item.id)} canEdit={data.canEdit} busy={busy === item.id} onPatch={patch => void mutate(item.id, `/api/interventions/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify(patch) })} onMeasure={() => void mutate(item.id, `/api/interventions/${item.id}/measure`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } })} />)}
              {items.length === 0 && <div className="rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-8 text-center text-xs text-[var(--text-tertiary)]">No actions here</div>}
            </div>
          </div>;
        })}
      </section>}
    </main>
  </>;
}

function ActionCard({ item, members, events, canEdit, busy, onPatch, onMeasure }: { item: TeamAction; members: Member[]; events: ActionEvent[]; canEdit: boolean; busy: boolean; onPatch: (patch: Record<string, unknown>) => void; onMeasure: () => void }) {
  const summary = item.impact_summary as ImpactSummary;
  const next = NEXT_STATUS[item.status];
  return <article className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
    <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest"><span className={priorityColor(item.priority)}>{item.priority}</span><span className="text-[var(--text-tertiary)]">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span></div>
    <h3 className="mt-2 text-sm font-medium leading-snug text-[var(--text-primary)]">{item.title}</h3>
    {item.hypothesis && <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]"><span className="text-[var(--text-tertiary)]">Hypothesis: </span>{item.hypothesis}</p>}
    {item.target_prompts?.[0] && <div className="mt-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-raised)] px-2 py-1.5 text-[11px] text-[var(--text-secondary)]">{item.target_prompts[0]}</div>}
    {(item.source_url || item.action_url) && <a className="mt-3 inline-flex items-center gap-1 text-xs text-[var(--accent-base)] hover:underline" href={item.source_url || item.action_url || '#'} target="_blank" rel="noreferrer">Open evidence <ArrowUpRight className="h-3 w-3" /></a>}
    {typeof summary?.visibility_change === "number" && <Receipt summary={summary} />}
    <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
      <label className="block text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]" htmlFor={`owner-${item.id}`}>Owner</label>
      <select id={`owner-${item.id}`} value={item.owner_id ?? ""} disabled={!canEdit || busy} onChange={event => onPatch({ owner_id: event.target.value || null })} className="min-h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)] px-2 text-xs text-[var(--text-primary)]"><option value="">Unassigned</option>{members.map(member => <option value={member.id} key={member.id}>{member.full_name || member.email}</option>)}</select>
      {canEdit && (item.status === "completed" || item.status === "measured") && <Button variant="outline" className="min-h-10 w-full" disabled={busy} onClick={onMeasure}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{NEXT_LABEL[item.status]}</Button>}
      {canEdit && next && <Button variant="outline" className="min-h-10 w-full" disabled={busy} onClick={() => onPatch({ status: next })}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-1.5 h-4 w-4" />}{NEXT_LABEL[item.status]}</Button>}
      {events.length > 0 && <details className="pt-1 text-[11px] text-[var(--text-tertiary)]"><summary className="min-h-10 cursor-pointer py-3">History · {events.length} event{events.length === 1 ? "" : "s"}</summary><ol className="space-y-1 border-l border-[var(--border-subtle)] pl-3">{events.slice(0, 5).map(event => <li key={event.id}>{event.event_type.replace('_', ' ')} · {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</li>)}</ol></details>}
    </div>
  </article>;
}

function CreateActionForm({ members, currentUserId, busy, onCancel, onSubmit }: { members: Member[]; currentUserId: string; busy: boolean; onCancel: () => void; onSubmit: (body: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState(""); const [hypothesis, setHypothesis] = useState(""); const [source, setSource] = useState(""); const [prompt, setPrompt] = useState(""); const [owner, setOwner] = useState(currentUserId);
  return <form className="grid gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); onSubmit({ action_type: "other", title, hypothesis, source_url: source || undefined, target_prompts: prompt ? [prompt] : [], owner_id: owner || null }); }}>
    <Field id="action-title" label="Action" value={title} onChange={setTitle} required placeholder="Publish a comparison page" /><Field id="action-hypothesis" label="Hypothesis" value={hypothesis} onChange={setHypothesis} required placeholder="This source gap is why we are absent" />
    <Field id="action-source" label="Evidence URL" value={source} onChange={setSource} type="url" placeholder="https://…" /><Field id="action-prompt" label="Target prompt" value={prompt} onChange={setPrompt} placeholder="What is the best…?" />
    <div><label htmlFor="action-owner" className="mb-1.5 block text-xs text-[var(--text-secondary)]">Owner</label><select id="action-owner" value={owner} onChange={event => setOwner(event.target.value)} className="min-h-11 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)] px-3 text-sm"><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.full_name || member.email}</option>)}</select></div>
    <div className="flex items-end justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy || !title.trim() || !hypothesis.trim()}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save action</Button></div>
  </form>;
}

function Field({ id, label, value, onChange, required, type = "text", placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; placeholder?: string }) { return <div><label htmlFor={id} className="mb-1.5 block text-xs text-[var(--text-secondary)]">{label}</label><input id={id} type={type} value={value} required={required} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="min-h-11 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)] px-3 text-sm text-[var(--text-primary)]" /></div>; }
function Receipt({ summary }: { summary: ImpactSummary }) { const delta = summary.visibility_change > 0 ? `+${summary.visibility_change}` : String(summary.visibility_change); return <div className="mt-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-raised)] p-3"><div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]"><CheckCircle2 className="h-3 w-3" />Verdict · {summary.verdict.replace('_', ' ')}</div><div className={cn("mt-1 text-2xl tabular-nums", summary.verdict === "improved" ? "text-[var(--accent-base)]" : summary.verdict === "regressed" ? "text-[var(--data-red)]" : "text-[var(--text-primary)]")}>{delta} <span className="text-xs text-[var(--text-tertiary)]">pts</span></div>{summary.reason && <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{summary.reason}</p>}{typeof summary.baseline_sample_count === "number" && <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">n={summary.baseline_sample_count} before · n={summary.followup_sample_count} after</p>}</div>; }
function priorityColor(priority: Priority) { return priority === "high" ? "text-[var(--data-red)]" : priority === "medium" ? "text-[var(--data-amber)]" : "text-[var(--text-tertiary)]"; }
function BoardSkeleton() { return <div aria-label="Loading actions" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{LANES.map(lane => <div key={lane.status} className="h-56 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />)}</div>; }
