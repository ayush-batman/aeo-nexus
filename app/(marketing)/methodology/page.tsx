import type { Metadata } from "next";

import { EvidencePanel, MarketingCTA, MarketingHero, MarketingSectionHeading } from "@/components/marketing/page-primitives";
import { BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { BRAND_MATCHING_CORPUS_VERSION } from "@/lib/ai/brand-matching";
import { MEASUREMENT_CONTRACT_VERSION, MEASUREMENT_SCORER_VERSION } from "@/lib/measurement/types";

export const metadata: Metadata = {
    title: "Aelo methodology · What the visibility number means",
    description: "See how Aelo counts mentions, handles failed samples, calculates confidence and decides whether two AI-visibility measurements can be compared.",
};

const COMPARISON_KEYS = ["Buyer prompt", "AI engine", "Provider model", "Region", "Measurement mode", "Search mode", "Scorer + contract", "Sentiment analyser"];

const RULES = [
    ["01", "Mention rate", "Deterministic", "Successful answers containing an exact brand or known alias count as mentions. Visibility is mentions divided by successful samples. Failed samples do not enter the denominator."],
    ["02", "Ranked position", "Deterministic", "When an answer contains a numbered, bulleted or headed list, Aelo records the first list item containing the brand. Position is averaged only where a valid position exists."],
    ["03", "Source provenance", "Deterministic", "A structured provider URL is a provider citation. A URL found only in generated prose is a mentioned link. Invalid, local and private-network URLs cannot become citation evidence."],
    ["04", "Sentiment", "Labelled analysis", "An analyser may classify the surrounding context. Its schema-checked output cannot change the deterministic mention count. When unavailable, Aelo labels the fallback and records zero analyser confidence."],
] as const;

export default function MethodologyPage() {
    return (
        <div className="bg-[#e9ece7] text-[#1d2523]">
            <BreadcrumbJsonLd items={[{ label: "Methodology", path: "/methodology" }]} />
            <MarketingHero eyebrow="Measurement, opened up" title="The number is useful only when you can challenge it." copy={<><p>Aelo keeps the prompt, every returned answer, failures, model, region, sample count and source evidence close enough to inspect.</p><div className="mt-6 flex flex-wrap gap-3 font-mono text-xs uppercase tracking-widest"><span className="border border-[#343c3b] px-3 py-2">{MEASUREMENT_CONTRACT_VERSION}</span><span className="border border-[#343c3b] px-3 py-2">{MEASUREMENT_SCORER_VERSION}</span><span className="border border-[#343c3b] px-3 py-2">brand {BRAND_MATCHING_CORPUS_VERSION}</span></div></>} />

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <MarketingSectionHeading eyebrow="Counting rules" title="Mechanical where possible. Labelled where judgment remains." copy={<p>The score cannot be edited by the sentiment analyser, a missing provider, or a URL copied from answer prose.</p>} />
                    <div className="mt-12 border-t border-[#bbc4bc]">
                        {RULES.map(([number, title, tag, copy]) => <article key={number} className="grid gap-4 border-b border-[#bbc4bc] py-8 md:grid-cols-[56px_.55fr_1.45fr]"><p className="font-mono text-xs text-[#416a88]">{number}</p><div><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#586560]">{tag}</p></div><p className="text-base leading-relaxed text-[#53615d]">{copy}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <MarketingSectionHeading light eyebrow="A real run, including the mistakes" title="One question pattern. 100 calls. The winner changed 45% of the time." copy={<p>This independent ChatGPT and Gemini experiment is why Aelo treats one answer as a receipt, not a visibility score.</p>} />
                    <div className="mt-12 grid gap-px border border-[#343c3b] bg-[#343c3b] lg:grid-cols-5">
                        {[
                            ["01 · Question", "What are the best [category] brands in India?", "The same question pattern was repeated 10 times per category on each engine."],
                            ["02 · Findings", "45% top-answer volatility", "Across 100 calls, the #1 recommendation changed on 45% of repeated checks."],
                            ["03 · Gap", "Two data-quality failures", "Blue Tokai and Blue Tokai Coffee Roasters split one entity. An initial Gemini run also exhausted its response budget and produced unreliable output."],
                            ["04 · Action", "Fix the measurement before interpreting it", "The invalid Gemini run was discarded, the response budget was corrected, brand aliases were normalized, and the identical questions were run again."],
                            ["05 · Movement", "A corrected 45% result—no invented lift", "The published figure comes from the corrected dataset. The invalid run is not shown as a baseline, and no brand-improvement claim is made without a matched post-action measurement."],
                        ].map(([stage, title, copy]) => <article key={stage} className="bg-[#171d1c] p-5"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8cbe0]">{stage}</p><h2 className="mt-5 text-lg font-semibold leading-snug">{title}</h2><p className="mt-4 text-sm leading-6 text-[#a4aeaa]">{copy}</p></article>)}
                    </div>
                    <p className="mt-6 max-w-4xl border-l-2 border-[#a8cbe0] pl-4 text-sm leading-6 text-[#a4aeaa]">Case boundary: this experiment measured recommendation volatility, not market share or the causal effect of an SEO change. Aelo applies the same rule in product: compare only matched prompts, engines, models, regions, modes and scoring versions.</p>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
                    <MarketingSectionHeading eyebrow="Confidence" title="A range, not fake precision." copy={<p>Aelo uses a 95% Wilson interval around the observed mention rate. Fewer samples create a wider interval, so the interface should sound less certain.</p>} />
                    <EvidencePanel eyebrow="Illustrative interval / 12 samples" title="Observed 58% · range 31–81%">
                        <div className="relative mt-6 h-12" aria-label="Illustrative confidence interval from 31 to 81 percent with an observed rate of 58 percent">
                            <div className="absolute inset-x-0 top-6 h-px bg-[#bbc4bc]" />
                            <div className="absolute left-[31%] right-[19%] top-[21px] h-2 bg-[#a8cbe0]" />
                            <div className="absolute left-[58%] top-4 h-5 w-0.5 bg-[#315873]" />
                        </div>
                        <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-[#586560]"><span>31 lower</span><span>58 observed</span><span>81 upper</span></div>
                        <p className="mt-7 text-sm leading-relaxed text-[#53615d]">Fewer than 8 successful samples stays low confidence. Medium needs at least 8 and an interval no wider than 50 points. High needs at least 20 and an interval no wider than 30 points.</p>
                    </EvidencePanel>
                </div>
            </section>

            <section className="bg-[#dbe8ee] px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
                    <MarketingSectionHeading eyebrow="Before versus after" title="Aelo refuses the easy comparison." copy={<p>Both periods need compatible conditions and enough successful samples. Even then, an observed change is not proof that one action caused it.</p>} />
                    <div className="grid gap-px border border-[#9eb4bd] bg-[#9eb4bd] sm:grid-cols-2">
                        {COMPARISON_KEYS.map((key, index) => <div key={key} className="flex items-center gap-3 bg-[#edf3f4] p-4 text-sm"><span className="font-mono text-xs text-[#416a88]">{String(index + 1).padStart(2, "0")}</span>{key}</div>)}
                        <p className="col-span-full border-l-2 border-[#895345] bg-[#f1e7e2] p-5 text-sm leading-relaxed text-[#704a40]"><strong className="block">If a condition fails, the verdict is inconclusive.</strong> When all conditions match, improvement or regression still requires non-overlapping 95% intervals.</p>
                    </div>
                </div>
            </section>

            <section className="bg-[#a8cbe0] px-4 py-24 md:px-6 md:py-28">
                <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><p className="font-mono text-xs uppercase tracking-widest text-[#315873]">Test the method</p><h2 className="mt-4 max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Open the answer. Check what Aelo counted.</h2></div><MarketingCTA href="/#scan">Run one real answer</MarketingCTA></div>
            </section>
        </div>
    );
}
