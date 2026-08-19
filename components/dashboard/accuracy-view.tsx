'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { RefreshCw, CheckCircle2, XCircle, Clock, HelpCircle, Lock, ExternalLink, Info } from 'lucide-react';
import type { AccuracySummary, AccuracyRow } from '@/lib/analytics/accuracy';
import { UpgradeModal, isPlanGate } from '@/components/billing/upgrade-modal';
import { LockedPreview } from '@/components/billing/locked-preview';

type Props = {
    summary: AccuracySummary;
    paidTier: boolean;
    plan: string;
    missingTable: boolean;
};

const VERDICT_COLOR: Record<AccuracyRow['verdict'], string> = {
    true:       'var(--data-green)',
    false:      'var(--data-red)',
    outdated:   'var(--data-amber)',
    unverified: 'var(--text-ghost)',
};

const VERDICT_LABEL: Record<AccuracyRow['verdict'], string> = {
    true:       'True',
    false:      'False',
    outdated:   'Outdated',
    unverified: 'Unverified',
};

function VerdictIcon({ v, className = 'h-4 w-4' }: { v: AccuracyRow['verdict']; className?: string }) {
    switch (v) {
        case 'true':       return <CheckCircle2 className={className} style={{ color: VERDICT_COLOR.true }} />;
        case 'false':      return <XCircle      className={className} style={{ color: VERDICT_COLOR.false }} />;
        case 'outdated':   return <Clock        className={className} style={{ color: VERDICT_COLOR.outdated }} />;
        default:           return <HelpCircle   className={className} style={{ color: VERDICT_COLOR.unverified }} />;
    }
}

// Illustrative sample shown blurred behind the upgrade card (not real data).
function SampleAccuracyTeaser() {
    const tiles = [
        { label: 'Accuracy', value: '50%', color: 'var(--accent-base)' },
        { label: 'True', value: '2', color: 'var(--data-green)' },
        { label: 'False', value: '1', color: 'var(--data-red)' },
        { label: 'Outdated', value: '1', color: 'var(--data-amber)' },
        { label: 'Unverified', value: '1', color: 'var(--text-ghost)' },
    ];
    const claims = [
        { v: 'False', c: 'var(--data-red)', claim: 'Your Business plan costs $25 per member per month', note: 'The model overstates the price to every prospect who asks.' },
        { v: 'Outdated', c: 'var(--data-amber)', claim: 'You do not offer SCIM provisioning', note: 'Shipped since; the model is repeating a pre-2024 limitation.' },
    ];
    return (
        <div>
            <div className="grid grid-cols-5 gap-3 mb-6">
                {tiles.map((t) => (
                    <div key={t.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="text-[11px] uppercase tracking-widest text-[var(--text-ghost)] mb-2">{t.label}</div>
                        <div className="text-3xl font-medium tabular-nums" style={{ color: t.color }}>{t.value}</div>
                    </div>
                ))}
            </div>
            <div className="grid gap-3">
                {claims.map((c) => (
                    <div key={c.claim} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                        <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: c.c }}>{c.v}</div>
                        <div className="text-sm text-[var(--text-primary)]">{c.claim}</div>
                        <div className="text-sm text-[var(--text-secondary)] mt-1">{c.note}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function AccuracyView({ summary, paidTier, plan, missingTable }: Props) {
    const [pending, startTransition] = useTransition();
    const [status, setStatus] = useState<string | null>(null);
    const [gateOpen, setGateOpen] = useState(false);
    const [gateMessage, setGateMessage] = useState<string | null>(null);

    if (missingTable) {
        return (
            <NoticeCard
                title="Migration 022 not applied"
                body="Apply supabase/migrations/022_accuracy_claims.sql in the Supabase SQL Editor, then reload."
            />
        );
    }

    if (!paidTier) {
        return (
            <LockedPreview
                feature="Accuracy Verdict"
                blurb="Free tracks whether AIs mention you. Starter and above check whether what they say is actually true, claim by claim. Available on Starter and above."
                plan={plan}
            >
                <SampleAccuracyTeaser />
            </LockedPreview>
        );
    }

    async function verify() {
        setStatus('Extracting claims + verifying against your site with gpt-5…');
        try {
            const res = await fetch('/api/accuracy/verify', { method: 'POST' });
            const body = await res.json();
            if (isPlanGate(res, body)) {
                setStatus(null);
                setGateMessage(body?.message ?? null);
                setGateOpen(true);
                return;
            }
            if (!res.ok) throw new Error(body?.error || 'Verify failed');
            setStatus(`Processed ${body.processed} scans → ${body.claims} claims verified. Reloading…`);
            startTransition(() => window.location.reload());
        } catch (err) {
            setStatus(`Failed: ${String(err)}`);
        }
    }

    if (summary.total === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
                <div className="text-lg font-medium text-[var(--text-primary)] mb-2">No verified claims yet</div>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-6">
                    Run at least one scan first, then click below to have gpt-5 extract every factual claim
                    the LLM made about you and check each against your website.
                </p>
                <button
                    onClick={verify}
                    disabled={pending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-base)] text-white text-sm font-medium disabled:opacity-60"
                >
                    <RefreshCw className={pending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    Verify recent scans
                </button>
                {status && <div className="mt-4 text-xs text-[var(--text-secondary)]">{status}</div>}
            </div>
        );
    }

    return (
        <>
            <UpgradeModal
                open={gateOpen}
                onClose={() => setGateOpen(false)}
                feature="Accuracy Verdict"
                message={gateMessage ?? undefined}
                unlocks={[
                    'Verify every factual claim AI makes about you against your live site',
                    'True, false or outdated verdicts, with the evidence',
                    'An alert the moment an engine states something wrong',
                ]}
            />

            {/* Stat row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <StatTile label="Accuracy" value={summary.accuracyPct !== null ? `${summary.accuracyPct}%` : '–'} tone="accent" />
                <StatTile label="True"       value={String(summary.counts.true)}       tone="green" />
                <StatTile label="False"      value={String(summary.counts.false)}      tone="red" />
                <StatTile label="Outdated"   value={String(summary.counts.outdated)}   tone="amber" />
                <StatTile label="Unverified" value={String(summary.counts.unverified)} tone="ghost" />
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs text-[var(--text-ghost)]">
                    <Info className="h-3.5 w-3.5" />
                    {summary.lastUpdated
                        ? `Last verified ${new Date(summary.lastUpdated).toLocaleDateString()}`
                        : 'Never verified'}
                </div>
                <button
                    onClick={verify}
                    disabled={pending}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-60"
                >
                    <RefreshCw className={pending ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                    Re-verify
                </button>
            </div>

            {status && <div className="mb-4 text-xs text-[var(--text-secondary)]">{status}</div>}

            <div className="space-y-3">
                {summary.rows.map(r => <ClaimCard key={r.id} row={r} />)}
            </div>
        </>
    );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: 'accent' | 'green' | 'red' | 'amber' | 'ghost' }) {
    const color = {
        accent: 'var(--accent-base)',
        green:  'var(--data-green)',
        red:    'var(--data-red)',
        amber:  'var(--data-amber)',
        ghost:  'var(--text-ghost)',
    }[tone];
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-xs uppercase tracking-widest text-[var(--text-ghost)] mb-1">{label}</div>
            <div className="text-2xl font-medium tabular-nums" style={{ color }}>{value}</div>
        </div>
    );
}

function ClaimCard({ row }: { row: AccuracyRow }) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-start gap-4">
                <VerdictIcon v={row.verdict} className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span
                            className="text-xs font-medium uppercase tracking-widest"
                            style={{ color: VERDICT_COLOR[row.verdict] }}
                        >
                            {VERDICT_LABEL[row.verdict]}
                        </span>
                        {row.scan?.platform && (
                            <span className="text-xs text-[var(--text-ghost)]">
                                · {row.scan.platform} · &ldquo;{row.scan.prompt}&rdquo;
                            </span>
                        )}
                    </div>
                    <div className="text-base text-[var(--text-primary)] mb-2 leading-relaxed">
                        {row.claim_text}
                    </div>
                    {row.reasoning && (
                        <div className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2">
                            {row.reasoning}
                        </div>
                    )}
                    {row.evidence_snippet && (
                        <blockquote className="mt-3 text-sm text-[var(--text-secondary)] border-l-2 border-[var(--border)] pl-3 italic">
                            &ldquo;{row.evidence_snippet}&rdquo;
                        </blockquote>
                    )}
                    {row.evidence_url && (
                        <Link
                            href={row.evidence_url}
                            target="_blank"
                            className="inline-flex items-center gap-1 mt-3 text-xs text-[var(--accent-base)] hover:opacity-80"
                        >
                            Source <ExternalLink className="h-3 w-3" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function NoticeCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <div className="text-base font-medium text-[var(--text-primary)] mb-2">{title}</div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">{body}</p>
        </div>
    );
}
