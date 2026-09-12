import type { Metadata } from "next";

import { EvidencePanel, MarketingCTA, MarketingHero, MarketingSectionHeading } from "@/components/marketing/page-primitives";

export const metadata: Metadata = {
    title: "About · Aelo",
    description: "Why Aelo treats the answer, denominator, confidence and source evidence as one product.",
};

const PRINCIPLES = [
    ["Honest data or no number", "A provider failure stays failed. Missing evidence does not become a zero, a synthetic answer, or a confident claim."],
    ["The receipt survives the score", "Every useful summary should lead back to the prompt, returned answer, sample, model and source evidence behind it."],
    ["An action is an investigation", "Aelo can rank a gap and help a team organize work. Only a compatible follow-up measurement can show what happened next."],
    ["Build for the room where it is questioned", "Marketing numbers need to survive finance, leadership and client review. Denominators and limits stay visible."],
] as const;

export default function AboutPage() {
    return (
        <div className="bg-[#e9ece7] text-[#1d2523]">
            <MarketingHero eyebrow="About Aelo" title="AI visibility should survive a skeptical room." copy={<p>We are building Aelo for marketers, founders and agencies who need to explain what an AI assistant actually said—not present another score nobody can audit.</p>} actions={<MarketingCTA href="/#scan" inverted>Read one real answer</MarketingCTA>} />

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.68fr_1.32fr] lg:items-start">
                    <MarketingSectionHeading eyebrow="Why it exists" title="The summary was never enough." copy={<p>A visibility percentage can point to a problem. It cannot explain the answer, prove a citation, or tell a team what to inspect next.</p>} />
                    <EvidencePanel eyebrow="Aelo's operating belief" title="The answer, denominator and source trail belong together.">
                        <p className="text-lg leading-relaxed text-[#3f4947]">Aelo repeats buyer questions, keeps every successful and failed sample, attaches confidence to the estimate, and turns gaps into bounded investigations. The evidence remains available when the headline is challenged.</p>
                        <div className="mt-8 border-l-2 border-[#a8cbe0] pl-4"><p className="font-semibold text-[#315873]">We would rather withhold a claim than decorate uncertain evidence.</p></div>
                    </EvidencePanel>
                </div>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <MarketingSectionHeading light eyebrow="Four product rules" title="What Aelo is built to obey." />
                    <div className="mt-12 grid gap-px border border-[#343c3b] bg-[#343c3b] md:grid-cols-2">
                        {PRINCIPLES.map(([title, copy], index) => <article key={title} className="bg-[#181d1d] p-6 md:p-8"><p className="font-mono text-xs text-[#a8cbe0]">0{index + 1}</p><h2 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-4 text-sm leading-relaxed text-[#a4aeaa]">{copy}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.68fr_1.32fr]">
                    <MarketingSectionHeading eyebrow="Built from India" title="A local starting point. A global measurement problem." />
                    <div className="min-w-0 space-y-5 text-base leading-relaxed text-[#53615d]"><p>Indian teams often evaluate global and local competitors in the same buying question, work in rupees, and need evidence their clients or leadership can inspect. That is a useful place to start building.</p><p>The method is not limited to one market. Aelo records model, region and measurement mode because context changes what an answer means. We expand by keeping those differences visible.</p><p>The goal is modest and difficult: report exactly what was observed, make the uncertainty legible, and help a team choose the next question worth answering.</p></div>
                </div>
            </section>

            <section className="bg-[#a8cbe0] px-4 py-24 md:px-6 md:py-28">
                <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><p className="font-mono text-xs uppercase tracking-widest text-[#315873]">Talk to the builders</p><h2 className="mt-4 max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Have a hard question about the method?</h2></div><MarketingCTA href="/contact">Contact Aelo</MarketingCTA></div>
            </section>
        </div>
    );
}
