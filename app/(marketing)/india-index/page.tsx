import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import type { Metadata } from "next";
import { loadCurrentEdition } from "@/lib/india-index";
import { RankingTable } from "./ranking-table";
import { IndiaIndexDatasetJsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

export const metadata: Metadata = {
    title: "India AI Visibility Index · Aelo",
    description: "Reviewed, published samples of AI answers about Indian brands, with sample counts, uncertainty intervals and source evidence.",
};

// Server component, pulls the current edition at request time.
// Every number below comes from a live llm_scans row. Honest data policy.
export const revalidate = 900; // 15 minutes; edition doesn't change often

export default async function IndiaIndexPage() {
    const edition = await loadCurrentEdition();

    return (
        <>
            {edition.brandCount > 0 && <IndiaIndexDatasetJsonLd
                label={edition.label}
                brandCount={edition.brandCount}
                categoriesTracked={edition.categoriesTracked.length}
            />}
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
                        Published observations of AI answers about Indian brands. Every result links
                        to selected samples and their settings. These are API observations, not a
                        claim about what every user sees in an assistant app.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-4 text-[11px] font-mono text-zinc-600">
                        <span>{edition.brandCount} brands · {edition.categoriesTracked.length} categories</span>
                        <span>·</span>
                        <span>{edition.brandCount ? `Published ${new Date(edition.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'No published results'}</span>
                    </div>
                </div>
            </section>

            {/* Ranking table (client island, supports clicking rows to open receipts) */}
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
                                t: "Matching measurement settings",
                                b: "An edition includes only explicitly reviewed samples with a matching prompt, engine, model, region, mode and scoring versions. A published brand needs at least four successful samples. This limited selection is not representative of every buyer question.",
                            },
                            {
                                t: "Honest data policy",
                                b: "Missing or failed measurements are not zero visibility. Zero percent means no mention in the published samples, not that the brand is invisible everywhere. Only explicitly approved publications are exposed; private workspaces stay private.",
                            },
                            {
                                t: "Rates, sample counts and uncertainty",
                                b: "Mention rate is mentions divided by successful samples. Each row includes a 95% Wilson interval. These describe repeat-sample uncertainty under a statistical independence assumption, not the experience of all users or proven market dominance.",
                            },
                            {
                                t: "How brands are picked",
                                b: "Entries are selected for a reviewed publication. Selection is not a claim that a brand leads its category. Inspect each receipt and the scope before drawing conclusions.",
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
                            Future editions
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                            Want your brand measured?
                        </h2>
                        <p className="text-[15px] text-zinc-400 leading-relaxed mb-6">
                            Apply to be included in the next edition. If your brand fits a category we track,
                            we can discuss a reviewed measurement. Inclusion, timing and favorable results are not guaranteed.
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
                            AI answers vary. Model behavior, prompt wording, search settings and timing can all change a result.
                            There is no universal ±10-point error bound. Use the actual sample counts, intervals and
                            published responses to judge what each result supports.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );
}
