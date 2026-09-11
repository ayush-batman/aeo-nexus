import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, Check, FileText, Globe, Grid3x3, Search, ShieldCheck, Target, TrendingDown } from "lucide-react";

export const metadata: Metadata = {
    title: "Aelo features · From AI answer to next action",
    description: "Measure real AI answers, inspect citation evidence and turn visibility gaps into ranked work your team can act on.",
};

const GROUPS = [
    {
        stage: "Measure",
        kicker: "Know what the assistants actually said",
        image: "/features/crawlers.png",
        imageAlt: "Aelo crawler access view",
        shell: "bg-[#dff7f1]",
        accent: "bg-[#148c78] text-white",
        features: [
            { icon: Search, name: "Repeated answer scans", desc: "Ask real buyer questions across ChatGPT, Gemini, Claude and Perplexity. Keep every returned answer and failure." },
            { icon: BarChart3, name: "Confidence you can defend", desc: "See mention frequency beside the number of samples and the strength of the observed signal." },
            { icon: Bot, name: "Crawler access", desc: "Check whether major AI crawlers can reach the pages you expect them to read." },
        ],
    },
    {
        stage: "Understand",
        kicker: "Open the evidence behind the score",
        image: "/features/insights.png",
        imageAlt: "Aelo source and action insights",
        shell: "bg-[#eeeaff]",
        accent: "bg-[#6d63f7] text-white",
        features: [
            { icon: Target, name: "Prompt gaps", desc: "Find the buyer questions where competitors appear and your brand does not." },
            { icon: Grid3x3, name: "Source ledger", desc: "Open the real URLs supplied by each provider and see which domains recur across samples." },
            { icon: TrendingDown, name: "Comparable movement", desc: "Compare like with like. Changed models, regions or sample plans produce an inconclusive result, not a victory claim." },
        ],
    },
    {
        stage: "Improve",
        kicker: "Give the team one useful move",
        image: "/features/accuracy.png",
        imageAlt: "Aelo evidence receipt and accuracy verdict",
        shell: "bg-[#fff5c8]",
        accent: "bg-[#efd631] text-[#4c4512]",
        features: [
            { icon: ShieldCheck, name: "Accuracy checks", desc: "Separate true, false and outdated claims when the source evidence supports a verdict." },
            { icon: FileText, name: "Decision reports", desc: "Share a clear record of what changed, what did not and how much evidence supports the result." },
            { icon: Globe, name: "Ranked action queue", desc: "Turn missed prompts and source gaps into work your team can assign, complete and measure again." },
        ],
    },
];

export default function FeaturesPage() {
    return (
        <div className="bg-[#f7f8ff] text-[#111936]">
            <section className="px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">Inside Aelo</p>
                        <h1 className="mt-5 max-w-[680px] bg-gradient-to-r from-[#111936] to-[#615f8c] bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">A clear answer. The evidence. What to do next.</h1>
                    </div>
                    <div className="lg:pb-2">
                        <p className="max-w-[680px] text-lg leading-relaxed text-[#58627d]">Aelo turns unstable AI answers into a result your team can inspect and act on. No mystery score and no hidden source list.</p>
                        <Link href="/#scan" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#6d63f7] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#5d53e8]">Run a real scan <ArrowRight className="size-4" /></Link>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-16 md:px-6 md:pb-24">
                <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl md:grid-cols-3">
                    <div className="bg-[#111936] p-8 text-white"><p className="text-xs font-semibold uppercase tracking-widest text-[#8de6d1]">The result</p><p className="mt-8 text-3xl font-semibold md:text-4xl">Mentioned</p><p className="mt-3 text-sm text-white/60">9 times across 16 samples</p></div>
                    <div className="bg-[#8de6d1] p-8"><p className="text-xs font-semibold uppercase tracking-widest text-[#17695d]">The confidence</p><p className="mt-8 text-3xl font-semibold md:text-4xl">Moderate</p><p className="mt-3 text-sm text-[#386b64]">Enough evidence to watch, not overclaim</p></div>
                    <div className="bg-[#f6e76b] p-8"><p className="text-xs font-semibold uppercase tracking-widest text-[#6e6119]">The action</p><p className="mt-8 text-2xl font-semibold">Earn a mention from two recurring category sources.</p><p className="mt-3 text-sm text-[#6e6119]">Illustrative product structure</p></div>
                </div>
            </section>

            {GROUPS.map((group, index) => (
                <section key={group.stage} className="px-4 py-12 md:px-6 md:py-16">
                    <div className={`mx-auto max-w-6xl rounded-3xl p-5 md:p-8 lg:p-12 ${group.shell}`}>
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                            <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                                <span className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-widest ${group.accent}`}>{group.stage}</span>
                                <h2 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">{group.kicker}</h2>
                                <div className="mt-8 space-y-6">
                                    {group.features.map((feature) => (
                                        <article key={feature.name} className="grid grid-cols-[40px_1fr] gap-4">
                                            <div className="flex size-10 items-center justify-center rounded-xl bg-white/65"><feature.icon className="size-5" strokeWidth={1.7} /></div>
                                            <div><h3 className="text-lg font-semibold">{feature.name}</h3><p className="mt-1 text-sm leading-relaxed text-[#58627d]">{feature.desc}</p></div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                            <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                                <div className="overflow-hidden rounded-2xl border border-[#111936]/10 bg-[#111936] p-2 shadow-[0_24px_70px_rgba(17,25,54,0.18)]">
                                    <Image src={group.image} alt={group.imageAlt} width={1200} height={760} className="h-auto w-full rounded-xl" sizes="(min-width: 1024px) 52vw, 100vw" />
                                </div>
                                <p className="mt-3 text-center text-xs text-[#66708b]">A real Aelo product view</p>
                            </div>
                        </div>
                    </div>
                </section>
            ))}

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 rounded-3xl bg-[#111936] p-8 text-white md:p-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                    <div><p className="text-sm font-semibold uppercase tracking-widest text-[#8de6d1]">Honesty is a product feature</p><h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">A failed provider is not a zero score.</h2><p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/60">Aelo keeps partial, failed, stale and incompatible states distinct so your team does not plan around a number the evidence cannot support.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        {["Raw answers stay available", "Provider citations stay distinct", "Comparisons require compatible samples", "Every result names its confidence"].map((item) => <p key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 text-sm"><span className="flex size-7 items-center justify-center rounded-full bg-[#8de6d1] text-[#103f3a]"><Check className="size-4" /></span>{item}</p>)}
                    </div>
                </div>
            </section>

            <section className="bg-[#ff9d8f] px-4 py-24 text-center text-[#44201c] md:px-6 md:py-32">
                <h2 className="mx-auto max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Start with one question your buyers already ask.</h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-[#6e3932]">The first live Gemini scan is free. No signup and no card.</p>
                <Link href="/#scan" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111936] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">See the real answer <ArrowRight className="size-4" /></Link>
            </section>
        </div>
    );
}
