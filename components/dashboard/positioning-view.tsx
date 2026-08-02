'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Info } from 'lucide-react';
import type { MatrixCell } from '@/lib/analytics/positioning';

type Entity = { name: string; type: 'brand' | 'competitor'; total: number };
type Attribute = { attribute: string; totalFrequency: number };

type Props = {
    data: {
        entities:   Entity[];
        attributes: Attribute[];
        cells:      Array<[string, MatrixCell]>;
        lastUpdated: string | null;
    };
    missingTable: boolean;
};

export function PositioningView({ data, missingTable }: Props) {
    const [pending, startTransition] = useTransition();
    const [status, setStatus] = useState<string | null>(null);
    const cellMap = new Map(data.cells);
    const maxFreq = Math.max(1, ...data.cells.map(([, c]) => c.frequency));

    async function regenerate() {
        setStatus('Running gpt-5-mini over your recent scans…');
        try {
            const res = await fetch('/api/positioning/regenerate', { method: 'POST' });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error || 'Regenerate failed');
            setStatus(`Processed ${body.processed} scans → ${body.attributes} attributes. Reloading…`);
            startTransition(() => window.location.reload());
        } catch (err) {
            setStatus(`Failed: ${String(err)}`);
        }
    }

    if (missingTable) {
        return (
            <NoticeCard
                title="Migration 021 not applied"
                body="Apply supabase/migrations/021_competitor_attributes.sql in the Supabase SQL Editor, then reload this page."
            />
        );
    }

    if (data.entities.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
                <div className="text-lg font-medium text-[var(--text-primary)] mb-2">No positioning data yet</div>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-6">
                    Positioning is a second-pass over your saved scans. Once you&apos;ve run at least one scan
                    with competitors listed, click below to extract what each LLM says about each brand.
                </p>
                <button
                    onClick={regenerate}
                    disabled={pending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-base)] text-white text-sm font-medium disabled:opacity-60"
                >
                    <RefreshCw className={pending ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    Extract from recent scans
                </button>
                {status && <div className="mt-4 text-xs text-[var(--text-secondary)]">{status}</div>}
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-xs text-[var(--text-ghost)]">
                    <Info className="h-3.5 w-3.5" />
                    {data.lastUpdated
                        ? `Last extracted ${new Date(data.lastUpdated).toLocaleDateString()}`
                        : 'Never extracted'}
                </div>
                <button
                    onClick={regenerate}
                    disabled={pending}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-60"
                >
                    <RefreshCw className={pending ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
                    Regenerate
                </button>
            </div>

            {status && <div className="mb-4 text-xs text-[var(--text-secondary)]">{status}</div>}

            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)]">
                            <th className="sticky left-0 z-10 bg-[var(--surface)] text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--text-ghost)] font-medium min-w-[160px]">
                                Entity
                            </th>
                            {data.attributes.map(a => (
                                <th
                                    key={a.attribute}
                                    className="text-left px-3 py-3 text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap"
                                >
                                    {a.attribute}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.entities.map(e => (
                            <tr key={e.name} className="border-b border-[var(--border)] last:border-0">
                                <td className="sticky left-0 z-10 bg-[var(--surface)] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs uppercase tracking-widest ${e.type === 'brand' ? 'text-[var(--accent-base)]' : 'text-[var(--text-ghost)]'}`}>
                                            {e.type === 'brand' ? 'You' : 'Competitor'}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{e.name}</div>
                                    <div className="text-xs text-[var(--text-ghost)]">{e.total} mentions</div>
                                </td>
                                {data.attributes.map(a => {
                                    const c = cellMap.get(`${e.name}|${a.attribute}`);
                                    const freq = c?.frequency ?? 0;
                                    const intensity = freq / maxFreq;
                                    return (
                                        <td key={a.attribute} className="px-3 py-3 text-center">
                                            <Cell freq={freq} intensity={intensity} platforms={c?.platforms ?? []} />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-[var(--text-ghost)] max-w-2xl leading-relaxed">
                Cell darkness = how often that attribute appeared alongside that entity across your recent scans.
                Compare rows to see where a competitor owns positioning you don&apos;t.
            </p>
        </>
    );
}

function Cell({ freq, intensity, platforms }: { freq: number; intensity: number; platforms: string[] }) {
    if (freq === 0) {
        return <span className="text-[var(--text-ghost)] text-xs">, </span>;
    }
    const opacity = Math.max(0.15, Math.min(1, intensity));
    return (
        <div
            title={`${freq}× · ${platforms.join(', ')}`}
            className="inline-flex items-center justify-center rounded-md min-w-[32px] px-2 py-1 text-xs font-medium tabular-nums"
            style={{
                backgroundColor: `color-mix(in srgb, var(--accent-base) ${Math.round(opacity * 100)}%, transparent)`,
                color: intensity > 0.5 ? 'white' : 'var(--text-primary)',
            }}
        >
            {freq}
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
