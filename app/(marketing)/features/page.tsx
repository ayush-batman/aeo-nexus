import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Aelo features · From AI answer to next action",
    description: "Measure real AI answers, inspect citation evidence and turn visibility gaps into ranked work your team can act on.",
};

const GROUPS = [
    {
        stage: "Measure",
        kicker: "Know what the assistants actually said.",
        image: "/features/crawlers.png",
        imageAlt: "Aelo crawler access view",
        features: [
            ["Repeated answers", "Ask real buyer questions across ChatGPT, Gemini, Claude and Perplexity. Keep every answer and every failure."],
            ["Defensible confidence", "See mention frequency beside the sample count and the uncertainty around the observed signal."],
            ["Crawler access", "Check whether major AI crawlers can reach the pages you expect them to read."],
        ],
    },
    {
        stage: "Understand",
        kicker: "Open the evidence behind the score.",
        image: "/features/insights.png",
        imageAlt: "Aelo source and action insights",
        features: [
            ["Prompt gaps", "Find the buyer questions where competitors appear and your brand does not."],
            ["Source ledger", "Open the URLs supplied by each provider and see which domains recur across samples."],
            ["Comparable movement", "Changed models, regions or sample plans produce an inconclusive result, not a victory claim."],
        ],
    },
    {
        stage: "Act",
        kicker: "Give the team one useful move.",
        image: "/features/accuracy.png",
        imageAlt: "Aelo evidence receipt and accuracy verdict",
        features: [
            ["Accuracy checks", "Separate true, false and outdated claims when the source evidence supports a verdict."],
            ["Decision reports", "Share what changed, what did not and how much evidence supports the result."],
            ["Ranked actions", "Turn missed prompts and source gaps into work your team can assign, complete and measure again."],
        ],
    },
] as const;

export default function FeaturesPage() {
    return (
        <div className="bg-[#e9ece7] text-[#1d2523]">
            <section className="bg-[#131717] px-4 pb-20 pt-20 text-[#eff2ec] md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto max-w-6xl">
                    <div className="border-b border-[#343c3b] pb-4 font-mono text-xs uppercase tracking-widest text-[#7c8985]">Inside Aelo / the five jobs</div>
                    <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_.72fr] lg:items-end">
                        <h1 className="max-w-[680px] bg-gradient-to-r from-white to-[#9b9b9b] bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">The answer. The evidence. The next move.</h1>
                        <div className="lg:pb-2">
                            <p className="max-w-[680px] text-lg leading-relaxed text-[#a4aeaa]">Aelo turns unstable AI answers into a result your team can inspect and act on. No mystery score. No hidden source list.</p>
                            <Link href="/#scan" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#a8cbe0] px-4 py-2 text-base font-semibold text-[#17201f] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#bdd9e8]">Run one real answer <ArrowRight className="size-4" /></Link>
                        </div>
                    </div>

                    <div className="mt-20 grid border-y border-[#343c3b] sm:grid-cols-3">
                        <Signal number="09/16" label="Observed mentions" note="Illustrative sample set" />
                        <Signal number="Medium" label="Confidence" note="Useful to watch, not overclaim" />
                        <Signal number="01" label="Ranked action" note="Earn a mention from recurring sources" />
                    </div>
                </div>
            </section>

            {GROUPS.map((group, index) => (
                <section key={group.stage} className={index % 2 ? "bg-[#dbe8ee] px-4 py-20 md:px-6 md:py-24" : "px-4 py-20 md:px-6 md:py-24"}>
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-10 grid gap-8 lg:grid-cols-[.65fr_1.35fr] lg:items-end">
                            <div><p className="font-mono text-xs uppercase tracking-widest text-[#416a88]">0{index + 1} / {group.stage}</p><h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight md:text-5xl">{group.kicker}</h2></div>
                            <div className="grid border-t border-[#adb8b0] sm:grid-cols-3">
                                {group.features.map(([name, desc]) => <article key={name} className="border-b border-[#adb8b0] py-6 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"><h3 className="text-base font-semibold">{name}</h3><p className="mt-3 text-sm leading-relaxed text-[#53615d]">{desc}</p></article>)}
                            </div>
                        </div>
                        <div className="border border-[#343c3b] bg-[#131717] p-2 shadow-[0_28px_80px_rgba(29,37,35,.2)] md:p-3">
                            <Image src={group.image} alt={group.imageAlt} width={1200} height={760} className="h-auto w-full" sizes="(min-width: 1024px) 1152px, 100vw" priority={index === 0} />
                        </div>
                        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-[#586560]">A real Aelo product view</p>
                    </div>
                </section>
            ))}

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_.9fr] lg:items-start">
                    <div><p className="font-mono text-xs uppercase tracking-widest text-[#a8cbe0]">Honesty is a product feature</p><h2 className="mt-4 max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">A failed provider is not a zero score.</h2><p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#a4aeaa]">Aelo keeps partial, failed, stale and incompatible states distinct so your team does not plan around evidence that does not exist.</p></div>
                    <ul className="border-t border-[#343c3b]">
                        {["Raw answers stay available", "Provider citations stay distinct", "Comparisons require compatible samples", "Every result names its confidence"].map((item, index) => <li key={item} className="flex min-h-16 items-center gap-5 border-b border-[#343c3b] py-4 text-base"><span className="font-mono text-xs text-[#7c8985]">0{index + 1}</span>{item}</li>)}
                    </ul>
                </div>
            </section>

            <section className="bg-[#a8cbe0] px-4 py-24 text-[#17201f] md:px-6 md:py-32">
                <div className="mx-auto flex max-w-6xl flex-col justify-between gap-10 lg:flex-row lg:items-end">
                    <div><p className="font-mono text-xs uppercase tracking-widest text-[#315873]">Start with the question</p><h2 className="mt-4 max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Ask what your buyers already ask.</h2><p className="mt-5 max-w-xl text-lg text-[#315873]">The first live Gemini scan is free. No signup. No card.</p></div>
                    <Link href="/#scan" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm bg-[#131717] px-4 py-2 text-base font-semibold text-[#eff2ec] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#202626]">Read one real answer <ArrowRight className="size-4" /></Link>
                </div>
            </section>
        </div>
    );
}

function Signal({ number, label, note }: { number: string; label: string; note: string }) {
    return <div className="border-b border-[#343c3b] py-7 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"><p className="text-3xl font-semibold tracking-tight">{number}</p><p className="mt-4 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-[#7c8985]">{note}</p></div>;
}
