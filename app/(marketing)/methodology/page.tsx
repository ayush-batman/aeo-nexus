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
                        {RULES.map(([number, title, tag, copy]) => <article key={number} className="grid gap-4 border-b border-[#bbc4bc] py-8 md:grid-cols-[56px_.55fr_1.45fr]"><p className="font-mono text-xs text-[#416a88]">{number}</p><div><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-2 font-mono text-xs uppercase tracking-widest text-[#65736f]">{tag}</p></div><p className="text-base leading-relaxed text-[#53615d]">{copy}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
                    <MarketingSectionHeading light eyebrow="Visibility" title="A mention rate. Nothing more mysterious." copy={<p>If a brand appears in 7 of 12 successful answers, observed visibility is 58.3%. Failed or untracked samples stay outside that number and remain visible beside it.</p>} />
                    <EvidencePanel eyebrow="Illustrative calculation" title="7 mentions / 12 successful samples">
                        <p className="text-6xl font-semibold tracking-tight">58.3%</p>
                        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-[#65736f]">mentions ÷ successful samples × 100</p>
                        <div className="mt-8 grid gap-5 border-t border-[#d2d7cf] pt-5 sm:grid-cols-3"><Fact label="Successful" value="12" /><Fact label="Failed" value="2" /><Fact label="Confidence" value="Medium" /></div>
                        <p className="mt-6 text-sm leading-relaxed text-[#53615d]">The two failed samples are reported, not converted into non-mentions. Illustrative structure, not a customer result.</p>
                    </EvidencePanel>
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
                        <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-[#65736f]"><span>31 lower</span><span>58 observed</span><span>81 upper</span></div>
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

function Fact({ label, value }: { label: string; value: string }) { return <div><p className="font-mono text-xs uppercase tracking-widest text-[#74807d]">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>; }
