"use client";
import { useState } from 'react';
import { ScanReceiptDrawer } from '@/components/dashboard/scan-receipt-drawer';
import type { IndiaBrandEntry, IndiaEdition } from '@/lib/india-index';

export function RankingTable({ edition }: { edition: IndiaEdition }) {
    const [openBrand, setOpenBrand] = useState<IndiaBrandEntry | null>(null);
    return <>
        <section className="pb-16 px-6">
            <div className="mx-auto max-w-5xl rounded-lg border border-white/[0.06] bg-black overflow-x-auto">
                {edition.entries.length === 0 ? <div className="p-10 text-center">
                    <p className="text-sm text-zinc-400">No reviewed results have been published for this edition.</p>
                    <p className="mt-2 text-xs text-zinc-500">This is not a zero-visibility result, and no running scan is implied.</p>
                </div> : <table className="w-full min-w-[680px] text-sm text-left">
                    <caption className="sr-only">Published observations for {edition.label}. Ordered by observed mention rate, not a statistically established market ranking.</caption>
                    <thead className="text-xs text-zinc-500 border-b border-white/[0.06]"><tr>
                        <th scope="col" className="p-4">Brand</th><th scope="col" className="p-4">Category</th>
                        <th scope="col" className="p-4">Mention rate</th><th scope="col" className="p-4">95% interval</th>
                        <th scope="col" className="p-4">Samples</th><th scope="col" className="p-4">Mean list position</th><th scope="col" className="p-4">Evidence</th>
                    </tr></thead>
                    <tbody>{edition.entries.map(entry => <tr key={entry.brand} className="border-b border-white/[0.04]">
                        <th scope="row" className="p-4 font-medium text-white">{entry.brand}
                            {entry.website && <a href={entry.website} target="_blank" rel="noreferrer" className="block min-h-10 pt-2 text-xs text-zinc-400 underline">
                                Website <span className="sr-only">for {entry.brand} (opens in a new tab)</span>
                            </a>}
                        </th>
                        <td className="p-4 text-zinc-400">{entry.category}</td>
                        <td className="p-4 tabular-nums text-white">{entry.mentionRatePct}%</td>
                        <td className="p-4 tabular-nums text-zinc-400">{Math.round(entry.intervalLower * 100)}–{Math.round(entry.intervalUpper * 100)}%</td>
                        <td className="p-4 tabular-nums text-zinc-400">{entry.scanCount}</td>
                        <td className="p-4 tabular-nums text-zinc-400">{entry.avgPosition === null ? '—' : entry.avgPosition.toFixed(1)}</td>
                        <td className="p-4"><button type="button" onClick={() => setOpenBrand(entry)} className="min-h-11 px-3 border border-white/15 rounded text-white focus-visible:outline focus-visible:outline-2">
                            View samples<span className="sr-only"> for {entry.brand}</span>
                        </button></td>
                    </tr>)}</tbody>
                </table>}
            </div>
            <p className="mx-auto max-w-5xl text-xs text-zinc-500 mt-4">
                Each percentage describes only the published samples. Zero mentions does not mean a brand is invisible.
                Intervals express repeat-sample uncertainty, not coverage of all users. Overlapping intervals do not establish a ranking.
                List position is not a recommendation score.
            </p>
        </section>
        {openBrand && <ScanReceiptDrawer open onOpenChange={open => { if (!open) setOpenBrand(null); }}
            title={openBrand.brand + ' · published samples'}
            subtitle="Explicitly selected, published API answers. Inspect the prompt, model, date and citation evidence; future answers may differ."
            dataSourceUrl={'/api/india-index/scans?edition=' + encodeURIComponent(edition.slug) + '&brand=' + encodeURIComponent(openBrand.brand)} />}
    </>;
}
