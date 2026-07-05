"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScanReceiptDrawer } from "@/components/dashboard/scan-receipt-drawer";
import type { IndiaBrandEntry, IndiaCategory, IndiaEdition } from "@/lib/india-index";

const CATEGORY_LABEL: Record<IndiaCategory, string> = {
    SaaS: 'SaaS', D2C: 'D2C', Fintech: 'Fintech', EdTech: 'EdTech', Consumer: 'Consumer',
};

const VERDICT_STYLE: Record<IndiaBrandEntry['verdict'], { label: string; className: string }> = {
    dominant:  { label: 'Dominant',  className: 'text-[var(--accent-base)] border-[var(--accent-base)]/30 bg-[var(--accent-muted)]' },
    strong:    { label: 'Strong',    className: 'text-[var(--data-green)] border-[var(--data-green)]/30 bg-[var(--data-green-muted)]' },
    contested: { label: 'Contested', className: 'text-[var(--data-amber)] border-[var(--data-amber)]/30 bg-[var(--data-amber-muted)]' },
    invisible: { label: 'Invisible', className: 'text-[var(--data-red)] border-[var(--data-red)]/30 bg-[var(--data-red-muted)]' },
};

// Client island: the ranking table + receipt drawer. Kept separate so the
// India Index page can stay a server component while this stays interactive.
export function RankingTable({ edition }: { edition: IndiaEdition }) {
    const [openBrand, setOpenBrand] = useState<IndiaBrandEntry | null>(null);

    return (
        <>
            <section className="pb-16 px-6">
                <div className="mx-auto max-w-5xl rounded-lg border border-white/[0.06] bg-black overflow-hidden">
                    <div className="grid grid-cols-[48px_1.5fr_0.9fr_0.9fr_0.9fr_1fr] items-center gap-3 px-4 py-3 border-b border-white/[0.06] text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                        <div>Rank</div>
                        <div>Brand</div>
                        <div>Category</div>
                        <div className="text-right">Mention rate</div>
                        <div className="text-right">Avg position</div>
                        <div>Verdict</div>
                    </div>

                    {edition.entries.length === 0 ? (
                        <EmptyEdition />
                    ) : (
                        edition.entries.map(entry => (
                            <BrandRow
                                key={entry.brand}
                                entry={entry}
                                onClick={() => setOpenBrand(entry)}
                            />
                        ))
                    )}
                </div>

                <p className="text-center text-[11px] font-mono text-zinc-600 mt-4">
                    Position 1.0 = named first in the AI&apos;s answer · Higher mention rate = more of the tested prompts named the brand · Click any row to see the raw scans
                </p>
            </section>

            {openBrand && (
                <ScanReceiptDrawer
                    open
                    onOpenChange={(v) => { if (!v) setOpenBrand(null); }}
                    title={`${openBrand.brand} · ${openBrand.mentionRatePct}% mention rate`}
                    subtitle={`The exact scans behind ${openBrand.brand}'s ${VERDICT_STYLE[openBrand.verdict].label.toLowerCase()} verdict. Every prompt was sent live; every response is verbatim from the platform. Reproduce any of them yourself.`}
                    dataSourceUrl={`/api/india-index/scans?brand=${encodeURIComponent(openBrand.brand)}`}
                />
            )}
        </>
    );
}

function BrandRow({ entry, onClick }: { entry: IndiaBrandEntry; onClick: () => void }) {
    const verdictStyle = VERDICT_STYLE[entry.verdict];
    return (
        <button
            onClick={onClick}
            className="w-full grid grid-cols-[48px_1.5fr_0.9fr_0.9fr_0.9fr_1fr] items-center gap-3 px-4 py-4 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors text-left"
        >
            <div className="text-[13px] font-mono text-zinc-500 tabular-nums">
                {String(entry.rank).padStart(2, '0')}
            </div>
            <div className="min-w-0">
                <div className="text-[14px] font-medium text-white truncate">{entry.brand}</div>
                {entry.website && (
                    <span
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 inline-block"
                    >
                        <a
                            href={`https://${entry.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 inline-flex items-center gap-1"
                        >
                            {entry.website} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </span>
                )}
            </div>
            <div className="text-[12px] text-zinc-400">
                {CATEGORY_LABEL[entry.category]}
            </div>
            <div className="text-right text-[14px] font-medium text-white tabular-nums">
                {entry.mentionRatePct}%
                <div className="mt-1 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[var(--accent-base)]"
                        style={{ width: `${entry.mentionRatePct}%` }}
                    />
                </div>
            </div>
            <div className="text-right text-[13px] tabular-nums text-zinc-300">
                {entry.avgPosition !== null ? `#${entry.avgPosition}` : <span className="text-zinc-600">—</span>}
            </div>
            <div>
                <span className={cn(
                    "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                    verdictStyle.className,
                )}>
                    {verdictStyle.label}
                </span>
            </div>
        </button>
    );
}

function EmptyEdition() {
    return (
        <div className="p-10 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
                No data yet
            </p>
            <p className="text-[14px] text-zinc-400">
                This edition is being compiled. Check back once the scan pass finishes, or read
                the <Link href="/manifesto" className="text-[var(--accent-base)] hover:underline">manifesto</Link> in the meantime.
            </p>
        </div>
    );
}
