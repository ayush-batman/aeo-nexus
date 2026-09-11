import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    Braces,
    Check,
    CircleAlert,
    FileCheck2,
    Fingerprint,
    FlaskConical,
    Scale,
} from "lucide-react";

import { BreadcrumbJsonLd } from "@/components/seo/structured-data";
import { BRAND_MATCHING_CORPUS_VERSION } from "@/lib/ai/brand-matching";
import { MEASUREMENT_CONTRACT_VERSION, MEASUREMENT_SCORER_VERSION } from "@/lib/measurement/types";

export const metadata: Metadata = {
    title: "Aelo methodology · What the visibility number means",
    description: "See how Aelo counts mentions, handles failed samples, calculates confidence and decides whether two AI-visibility measurements can be compared.",
};

const PRINCIPLES = [
    {
        icon: FileCheck2,
        title: "The answer stays attached",
        copy: "A summary without its prompt, returned answer, engine and sample count is not evidence. Aelo keeps those parts together.",
        color: "bg-[#dff7f1] text-[#103f3a]",
    },
    {
        icon: CircleAlert,
        title: "A failure is not a zero",
        copy: "A timeout or unavailable provider is recorded as failed. It never becomes an invented ‘brand not mentioned’ result.",
        color: "bg-[#fff0ed] text-[#57251f]",
    },
    {
        icon: Fingerprint,
        title: "Conditions travel with the score",
        copy: "Model, region, mode and scoring versions remain attached so incompatible runs cannot quietly look comparable.",
        color: "bg-[#eeeaff] text-[#312c74]",
    },
];

const COMPARISON_KEYS = [
    "Buyer prompt",
    "AI engine",
    "Provider model",
    "Region",
    "Measurement mode",
    "Search mode",
    "Scorer + contract",
    "Sentiment analyser",
];

export default function MethodologyPage() {
    return (
        <div className="bg-[#f7f8ff] text-[#111936]">
            <BreadcrumbJsonLd items={[{ label: "Methodology", path: "/methodology" }]} />

            <section className="px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.72fr] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">Measurement, opened up</p>
                        <h1 className="mt-5 max-w-[760px] text-5xl font-semibold tracking-tight md:text-7xl">The number is only useful if you can challenge it.</h1>
                    </div>
                    <div className="lg:pb-2">
                        <p className="text-lg leading-relaxed text-[#58627d]">Aelo measures observed AI answers. It does not measure every answer every buyer will ever see, and it does not pretend one lucky run is a market fact.</p>
                        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-full bg-[#eeeaff] px-3 py-2 text-[#5d53e8]">{MEASUREMENT_CONTRACT_VERSION}</span>
                            <span className="rounded-full bg-[#dff7f1] px-3 py-2 text-[#148c78]">{MEASUREMENT_SCORER_VERSION}</span>
                            <span className="rounded-full bg-[#fff5c8] px-3 py-2 text-[#786b10]">brand corpus {BRAND_MATCHING_CORPUS_VERSION}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-24 md:px-6 md:pb-32">
                <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
                    {PRINCIPLES.map((principle) => (
                        <article key={principle.title} className={`rounded-3xl p-6 md:p-8 ${principle.color}`}>
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/70"><principle.icon className="size-6" /></div>
                            <h2 className="mt-8 text-2xl font-semibold tracking-tight">{principle.title}</h2>
                            <p className="mt-3 text-base leading-relaxed opacity-75">{principle.copy}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="bg-[#111936] px-4 py-24 text-white md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-[#8de6d1]">The primary metric</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Visibility is a mention rate. Nothing more mysterious.</h2>
                            <p className="mt-5 text-base leading-relaxed text-white/60">Every successful answer gets one yes or no: did it name the tracked brand? Failed answers stay outside the denominator.</p>
                        </div>
                        <div className="rounded-3xl bg-[#eeeaff] p-6 text-[#312c74] md:p-10">
                            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest"><Braces className="size-5" />Formula</div>
                            <p className="mt-8 font-mono text-xl leading-relaxed md:text-3xl">visibility = mentions ÷ successful samples × 100</p>
                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                <MetricFact value="7" label="brand mentions" />
                                <MetricFact value="12" label="successful samples" />
                                <MetricFact value="58%" label="observed visibility" />
                            </div>
                            <p className="mt-6 text-sm leading-relaxed opacity-70">Illustrative calculation. A real result always shows its own counts and evidence.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">How an answer becomes evidence</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Some judgments are mechanical. One is labelled analysis.</h2>
                        <p className="mt-5 text-lg leading-relaxed text-[#58627d]">That distinction matters. Mention counting and citation provenance use explicit rules. Sentiment can use an AI analyser, so its method and model are stored with the result.</p>
                    </div>
                    <div className="mt-12 grid gap-4 lg:grid-cols-2">
                        <RuleCard
                            number="01"
                            title="Brand mention"
                            tag="Deterministic"
                            copy="Aelo matches the configured brand name and domain with letter-and-number boundaries. It normalises case, spaces, hyphens and Unicode. Very short names need brand context or a trademark mark to avoid accidental matches. It does not invent fuzzy deletion variants."
                            color="bg-[#dff7f1]"
                        />
                        <RuleCard
                            number="02"
                            title="Ranked position"
                            tag="Deterministic"
                            copy="If an answer contains a numbered, bulleted or headed list, Aelo records the first list item containing the brand. Position is averaged only across successful samples where a valid position exists."
                            color="bg-[#fff5c8]"
                        />
                        <RuleCard
                            number="03"
                            title="Source provenance"
                            tag="Deterministic"
                            copy="A URL returned through a provider’s structured citation field is a provider citation. A URL found only inside generated prose is labelled link mentioned. Invalid, local and private-network URLs are not promoted to citation evidence."
                            color="bg-[#eeeaff]"
                        />
                        <RuleCard
                            number="04"
                            title="Sentiment"
                            tag="Labelled analysis"
                            copy="An AI analyser may classify positive, neutral or negative context. Its output is schema-checked and cannot change the deterministic mention count. If analysis is unavailable, Aelo records a labelled keyword estimate with zero analyser confidence."
                            color="bg-[#fff0ed]"
                        />
                    </div>
                </div>
            </section>

            <section className="bg-[#e9efff] px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#4d73d5]">Confidence</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">A range, not fake precision.</h2>
                        <p className="mt-5 text-lg leading-relaxed text-[#58627d]">Aelo shows a 95% Wilson interval around the observed mention rate. In plain words: fewer samples create a wider band, so the interface should sound less certain.</p>
                    </div>
                    <div className="rounded-3xl bg-white p-6 md:p-10">
                        <div className="flex items-center justify-between gap-6"><span className="text-sm font-semibold">Illustrative confidence view</span><span className="rounded-full bg-[#fff5c8] px-3 py-2 text-xs font-semibold text-[#786b10]">12 samples</span></div>
                        <div className="mt-10">
                            <div className="relative h-4 rounded-full bg-[#e7eaf4]"><div className="absolute left-[31%] right-[15%] h-4 rounded-full bg-[#8de6d1]" /><div className="absolute left-[58%] top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-[#6d63f7] shadow-md" /></div>
                            <div className="mt-4 flex justify-between text-xs font-semibold text-[#66708b]"><span>lower bound</span><span>observed rate</span><span>upper bound</span></div>
                        </div>
                        <p className="mt-8 text-sm leading-relaxed text-[#58627d]">Confidence labels are based on sample count and interval width. Fewer than 8 successful samples stays low. Medium needs at least 8 samples and a range no wider than 50 points; high needs at least 20 and a range no wider than 30 points. They describe repeatability in Aelo’s observed runs—not the probability that every future user sees the same answer.</p>
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">Before versus after</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Aelo refuses the easy comparison.</h2>
                            <p className="mt-5 text-lg leading-relaxed text-[#58627d]">A change is comparable only when the measurement conditions match, each retained prompt-and-engine cohort has at least four successful samples in both periods, and the sample mix has not shifted.</p>
                        </div>
                        <div className="rounded-3xl bg-[#111936] p-6 text-white md:p-10">
                            <div className="flex items-center gap-3"><Scale className="size-6 text-[#8de6d1]" /><h3 className="text-xl font-semibold">Conditions that must match</h3></div>
                            <div className="mt-7 grid gap-3 sm:grid-cols-2">
                                {COMPARISON_KEYS.map((key) => <div key={key} className="flex items-center gap-3 rounded-xl bg-white/7 px-4 py-3 text-sm"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#8de6d1] text-[#103f3a]"><Check className="size-3.5" /></span>{key}</div>)}
                            </div>
                            <div className="mt-7 rounded-2xl bg-[#fff0ed] p-5 text-[#57251f]"><p className="font-semibold">If those rules fail, the verdict is inconclusive.</p><p className="mt-2 text-sm leading-relaxed opacity-75">When they pass, Aelo only calls improvement or regression when the two 95% intervals do not overlap. Even then, it reports observed change—not proof that one action caused it.</p></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[#dff7f1] px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-[#148c78]">What is stored</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">The receipt survives the summary.</h2>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <StorageFact title="Convex product data" copy="Workspace-bound records hold scans, compact metrics, actions and access-controlled product state." />
                            <StorageFact title="Raw evidence" copy="The returned answer, sample identity, failures and structured source evidence remain linked to the run." />
                            <StorageFact title="Persistence status" copy="A run says whether evidence was stored, partially stored or failed to persist. The UI must not hide that state." />
                            <StorageFact title="One contract" copy="Dashboard, versioned API and MCP read the same measurement contract instead of inventing their own score." />
                        </div>
                    </div>
                </div>
            </section>

            <section className="bg-[#ffdd65] px-4 py-24 text-center md:px-6 md:py-32">
                <div className="mx-auto max-w-3xl">
                    <FlaskConical className="mx-auto size-10" />
                    <h2 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">Don’t trust the page. Test the method.</h2>
                    <p className="mx-auto mt-5 max-w-xl text-lg text-[#62591f]">Run one real Gemini scan, then open the answer and inspect what Aelo counted.</p>
                    <Link href="/#scan" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111936] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">Run a real scan <ArrowRight className="size-4" /></Link>
                </div>
            </section>
        </div>
    );
}

function MetricFact({ value, label }: { value: string; label: string }) {
    return <div className="rounded-2xl bg-white/70 p-4"><p className="text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p></div>;
}

function RuleCard({ number, title, tag, copy, color }: { number: string; title: string; tag: string; copy: string; color: string }) {
    return <article className={`rounded-3xl p-6 md:p-8 ${color}`}><div className="flex items-center justify-between gap-4"><span className="text-xs font-semibold tracking-widest text-[#66708b]">{number}</span><span className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold">{tag}</span></div><h3 className="mt-8 text-3xl font-semibold tracking-tight">{title}</h3><p className="mt-4 text-base leading-relaxed text-[#58627d]">{copy}</p></article>;
}

function StorageFact({ title, copy }: { title: string; copy: string }) {
    return <article className="rounded-2xl bg-white/70 p-5"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[#386b64]">{copy}</p></article>;
}
