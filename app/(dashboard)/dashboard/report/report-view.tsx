"use client";

import Link from "next/link";
import { Printer, Download, Lock, ArrowRight } from "lucide-react";
import type { Report } from "@/lib/analytics/report";

function csvEscape(v: string | number | null): string {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(report: Report) {
    const lines: string[] = [];
    lines.push(`Aelo AI Visibility Report,${report.brand}`);
    lines.push(`Period,${report.from} to ${report.to}`);
    lines.push("");
    lines.push("Engine,Mention rate %,Mentioned,Tested,Avg position");
    for (const e of report.engines) {
        lines.push([e.label, e.mentionRate, e.mentioned, e.tested, e.avgPosition ?? ""].map(csvEscape).join(","));
    }
    lines.push("");
    lines.push("Prompt,Mentioned,Tested,Best position,Engines");
    for (const p of report.prompts) {
        lines.push([p.prompt, p.mentioned, p.tested, p.bestPosition ?? "", p.engines.join(" | ")].map(csvEscape).join(","));
    }
    if (report.competitors.length) {
        lines.push("");
        lines.push("Competitor,Times mentioned");
        for (const c of report.competitors) lines.push([c.name, c.count].map(csvEscape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aelo-report-${report.brand.toLowerCase().replace(/\s+/g, "-")}-${report.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ReportView({ paid, brand, report }: { paid: boolean; brand: string; report: Report | null }) {
    if (!paid || !report) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-10 text-center">
                    <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-base)]/25 bg-[var(--accent-muted)]">
                        <Lock className="h-5 w-5 text-[var(--accent-base)]" />
                    </div>
                    <h1 className="text-xl font-semibold text-[var(--text-primary)]">Client reports are a paid feature</h1>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        Generate a branded, client-ready AI visibility report for {brand}: per-engine mention rates,
                        a prompt-level breakdown, competitor share, and the receipts behind every number. Export as
                        PDF or CSV.
                    </p>
                    <Link href="/pricing" className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-base)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] hover:opacity-90">
                        See plans <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        );
    }

    const s = report;
    const empty = s.totalScans === 0;

    return (
        <div className="report-root p-6 md:p-8 max-w-4xl mx-auto">
            {/* Toolbar (hidden in print) */}
            <div className="no-print mb-6 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Client report</h1>
                    <p className="text-sm text-[var(--text-secondary)]">Branded, print-ready. Save as PDF or export CSV.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => downloadCsv(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <Download className="h-4 w-4" /> CSV
                    </button>
                    <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-base)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] hover:opacity-90">
                        <Printer className="h-4 w-4" /> Save as PDF
                    </button>
                </div>
            </div>

            {/* The report sheet */}
            <div className="report-sheet rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                <div className="flex items-start justify-between border-b border-[var(--border-default)] pb-5 mb-6">
                    <div>
                        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--accent-base)] mb-1">AI Visibility Report</div>
                        <div className="text-2xl font-bold text-[var(--text-primary)]">{s.brand}</div>
                        <div className="text-sm text-[var(--text-secondary)] mt-1">{s.from} to {s.to} · {s.periodDays} days</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-[var(--text-primary)]">aelo</div>
                        <div className="text-[11px] text-[var(--text-ghost)]">aelohq.com</div>
                    </div>
                </div>

                {empty ? (
                    <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
                        No scans in this period yet. Run scans from the LLM Tracker, then generate the report.
                    </p>
                ) : (
                    <>
                        {/* Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <Tile label="Mention rate" value={`${s.overallMentionRate}%`} />
                            <Tile label="Avg position" value={s.avgPosition != null ? String(s.avgPosition) : "–"} />
                            <Tile label="Scans" value={String(s.totalScans)} />
                            <Tile label="Prompts" value={String(s.uniquePrompts)} />
                        </div>

                        {/* Per engine */}
                        <Section title="Visibility by engine" />
                        <table className="w-full text-sm mb-8">
                            <thead>
                                <tr className="text-[var(--text-ghost)] text-xs uppercase tracking-wide border-b border-[var(--border-default)]/60">
                                    <th className="text-left font-medium py-2">Engine</th>
                                    <th className="text-right font-medium py-2">Mention rate</th>
                                    <th className="text-right font-medium py-2">Mentioned</th>
                                    <th className="text-right font-medium py-2">Avg position</th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.engines.map(e => (
                                    <tr key={e.platform} className="border-b border-[var(--border-default)]/30">
                                        <td className="py-2.5 text-[var(--text-primary)] font-medium">{e.label}</td>
                                        <td className="py-2.5 text-right"><span className="font-semibold text-[var(--accent-base)]">{e.mentionRate}%</span></td>
                                        <td className="py-2.5 text-right text-[var(--text-secondary)]">{e.mentioned} / {e.tested}</td>
                                        <td className="py-2.5 text-right text-[var(--text-secondary)]">{e.avgPosition ?? "–"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Per prompt */}
                        <Section title="By question" />
                        <table className="w-full text-sm mb-8">
                            <thead>
                                <tr className="text-[var(--text-ghost)] text-xs uppercase tracking-wide border-b border-[var(--border-default)]/60">
                                    <th className="text-left font-medium py-2">Question</th>
                                    <th className="text-right font-medium py-2">Named</th>
                                    <th className="text-right font-medium py-2">Best pos.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {s.prompts.slice(0, 25).map((p, i) => (
                                    <tr key={i} className="border-b border-[var(--border-default)]/30">
                                        <td className="py-2.5 text-[var(--text-primary)] pr-4">{p.prompt}</td>
                                        <td className="py-2.5 text-right text-[var(--text-secondary)] whitespace-nowrap">{p.mentioned} / {p.tested}</td>
                                        <td className="py-2.5 text-right text-[var(--text-secondary)]">{p.bestPosition ?? "–"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Competitors */}
                        {s.competitors.length > 0 && (
                            <>
                                <Section title="Competitors named alongside you" />
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {s.competitors.map(c => (
                                        <span key={c.name} className="rounded-full border border-[var(--border-default)] px-3 py-1 text-sm text-[var(--text-secondary)]">
                                            {c.name} <span className="text-[var(--text-ghost)]">· {c.count}</span>
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}

                        <p className="text-[11px] text-[var(--text-ghost)] border-t border-[var(--border-default)]/60 pt-4 mt-4">
                            Every number is computed from real scans across live AI engines. Generated by Aelo · aelohq.com ·
                            {" "}{new Date(s.generatedAt).toLocaleDateString()}. AI output is probabilistic; rates are estimates over the period shown.
                        </p>
                    </>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    .report-root { padding: 0 !important; max-width: 100% !important; }
                    .report-sheet { border: none !important; background: #fff !important; color: #111 !important; padding: 0 !important; }
                    .report-sheet * { color: #111 !important; border-color: #ddd !important; }
                    aside, header, nav { display: none !important; }
                    body { background: #fff !important; }
                }
            `}</style>
        </div>
    );
}

function Tile({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)]/40 p-4">
            <div className="text-[var(--text-secondary)] text-xs font-medium">{label}</div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</div>
        </div>
    );
}

function Section({ title }: { title: string }) {
    return <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</h2>;
}
