import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import type { Metadata } from "next";
import { loadCurrentEdition } from "@/lib/india-index";
import { RankingTable } from "./ranking-table";
import { IndiaIndexDatasetJsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

export const metadata: Metadata = {
    title: "India AI Visibility Index · Aelo",
    description: "How ChatGPT, Gemini, Claude and Perplexity actually answer India's top intent queries. Real scans. Refreshed monthly.",
};

// Server component — pulls the current edition at request time.
// Every number below comes from a live llm_scans row. Honest data policy.
export const revalidate = 900; // 15 minutes; edition doesn't change often

export default async function IndiaIndexPage() {
    const edition = await loadCurrentEdition();

    return (
        <>
            <IndiaIndexDatasetJsonLd
                label={edition.label}
                brandCount={edition.brandCount}
                categoriesTracked={edition.categoriesTracked.length}
            />
            <BreadcrumbJsonLd items={[{ label: 'India AI Visibility Index', path: '/india-index' }]} />
            {/* Hero */}
            <section className="pt-20 pb-14 md:pt-28 md:pb-16 px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] mb-6">
                        <span className="text-[10px] font-mono text-zinc-500 tracking-[0.16em] uppercase">
                            {edition.label} {edition.isPreview ? '· Preview Edition' : '· Edition'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.02] text-white text-balance mb-5">
                        The India AI Visibility Index
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        How ChatGPT, Gemini, Claude and Perplexity actually answer India&apos;s top
                        intent queries. Every number below is from a live scan. Zero fabricated.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-4 text-[11px] font-mono text-zinc-600">
                        <span>{edition.brandCount} brands · {edition.categoriesTracked.length} categories</span>
                        <span>·</span>
                        <span>Refreshed {new Date(edition.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                </div>
            </section>

            {/* Ranking table (client island — supports clicking rows to open receipts) */}
            <RankingTable edition={edition} />

            {/* Methodology + trust */}
            <section className="py-16 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="mb-10">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            Methodology
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white max-w-2xl">
                            Every number is one query away from the raw scan.
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            {
                                t: "Real scans, no averages of averages",
                                b: "Each brand is measured against 2–3 category-representative Indian intent prompts (\"best CRM for Indian SMBs\", \"lowest brokerage intraday India\"). We run them live on Gemini, capture the response, and analyze it. Prompts are public.",
                            },
                            {
                                t: "Honest data policy",
                                b: "When a scan provider fails, we surface an honest empty state. When a brand isn't named, we say invisible — not \"low visibility\". Zero fabricated metrics ever ship.",
                            },
                            {
                                t: "Verdict rules (Sage: strict thresholds)",
                                b: "Dominant = ≥90% mention rate AND avg position ≤2. Strong = ≥60%. Contested = 1–59%. Invisible = 0%. No smoothing.",
                            },
                            {
                                t: "How brands are picked",
                                b: "For the Preview Edition, category leaders across SaaS, D2C, Fintech and EdTech. Future editions expand from applications and reader nominations.",
                            },
                        ].map(c => (
                            <div key={c.t} className="rounded-md border border-white/[0.06] bg-black p-5">
                                <div className="text-[14px] font-medium text-white mb-1.5">{c.t}</div>
                                <div className="text-[13px] text-zinc-500 leading-relaxed">{c.b}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Get featured CTA */}
            <section className="py-20 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <div className="rounded-lg border border-[var(--accent-base)]/40 bg-black p-8 md:p-10">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--accent-base)] mb-3">
                            Next edition · August 2026
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                            Want your brand measured?
                        </h2>
                        <p className="text-[15px] text-zinc-400 leading-relaxed mb-6">
                            Apply to be included in the next edition. If your brand fits a category we track,
                            we&apos;ll run the scans and publish the receipt. Featured brands get a free
                            month of Command to see their per-prompt gaps.
                        </p>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <Link
                                href="/contact?interest=india-index"
                                className="text-[14px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-5 py-2.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2"
                            >
                                Apply to be measured <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                                href="/manifesto"
                                className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                            >
                                Read our honest-data manifesto →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Fine print */}
            <section className="py-12 border-t border-white/5">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="flex items-start gap-2.5 text-[12px] text-zinc-500 leading-relaxed">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zinc-600" strokeWidth={1.5} />
                        <p>
                            LLM answers are non-deterministic — a single scan is a sample, not a truth. The Index
                            aggregates multiple prompts per brand to reduce noise, but any single number can drift
                            ±10 pts between measurements. See the raw responses in your own Aelo workspace to audit
                            any entry.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
