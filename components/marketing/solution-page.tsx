import { MarketingCTA, MarketingHero, MarketingSectionHeading } from "@/components/marketing/page-primitives";

export interface SolutionContent {
    persona: string;
    headline: string;
    subheadline: string;
    problem: { title: string; body: string };
    capabilities: { title: string; body: string }[];
    proofPoints: string[];
    tierRecommendation: { tierName: string; rationale: string };
    ctaCopy?: string;
}

export function SolutionPage({ content }: { content: SolutionContent }) {
    return (
        <div className="bg-[#e9ece7] text-[#1d2523]">
            <MarketingHero eyebrow={`For ${content.persona}`} title={content.headline} copy={<p>{content.subheadline}</p>} actions={<><MarketingCTA href="/#scan" inverted>Run one real answer</MarketingCTA><MarketingCTA href="/pricing" inverted>See plans</MarketingCTA></>} />

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.68fr_1.32fr] lg:items-start">
                    <MarketingSectionHeading eyebrow="The blind spot" title={content.problem.title} />
                    <div className="border-l-2 border-[#a8cbe0] pl-6 text-lg leading-relaxed text-[#53615d]">{content.problem.body}</div>
                </div>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <MarketingSectionHeading light eyebrow="The working loop" title={`What ${content.persona.toLowerCase()} can do in Aelo.`} />
                    <div className="mt-12 grid gap-px border border-[#343c3b] bg-[#343c3b] md:grid-cols-2">
                        {content.capabilities.map((capability, index) => <article key={capability.title} className="bg-[#181d1d] p-6 md:p-8"><p className="font-mono text-xs text-[#a8cbe0]">0{index + 1}</p><h2 className="mt-8 text-2xl font-semibold tracking-tight">{capability.title}</h2><p className="mt-4 text-sm leading-relaxed text-[#a4aeaa]">{capability.body}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.68fr_1.32fr]">
                    <MarketingSectionHeading eyebrow="What stays defensible" title="The limits travel with the result." />
                    <div className="border-t border-[#bbc4bc]">{content.proofPoints.map((point, index) => <div key={point} className="grid gap-3 border-b border-[#bbc4bc] py-5 sm:grid-cols-[44px_1fr]"><span className="font-mono text-xs text-[#416a88]">0{index + 1}</span><p className="text-base leading-relaxed text-[#53615d]">{point}</p></div>)}</div>
                </div>
            </section>

            <section className="bg-[#dbe8ee] px-4 py-24 md:px-6 md:py-28">
                <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.68fr_1.32fr] lg:items-end">
                    <div><p className="font-mono text-xs uppercase tracking-widest text-[#416a88]">Suggested plan · {content.tierRecommendation.tierName}</p><h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">{content.ctaCopy ?? "Start with the answer you need to understand."}</h2></div>
                    <div><p className="max-w-xl text-base leading-relaxed text-[#53615d]">{content.tierRecommendation.rationale}</p><div className="mt-7 flex flex-wrap gap-3"><MarketingCTA href="/signup">Create a workspace</MarketingCTA><MarketingCTA href="/pricing">Compare plans</MarketingCTA></div></div>
                </div>
            </section>
        </div>
    );
}
