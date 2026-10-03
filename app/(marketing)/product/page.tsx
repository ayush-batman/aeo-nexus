import type { Metadata } from "next";

import { EvidencePanel, MarketingCTA, MarketingHero, MarketingSectionHeading } from "@/components/marketing/page-primitives";
import { BreadcrumbJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/structured-data";

export const metadata: Metadata = {
    title: "How Aelo works · From AI answer to evidence",
    description: "Aelo repeats real buyer prompts across AI assistants, keeps the evidence and turns visibility gaps into work your team can measure again.",
};

const STEPS = [
    ["01", "Choose buyer questions", "Start with three to five questions that could put your brand on a buyer’s shortlist. Edit every prompt before it runs.", "Prompt text and version stay attached."],
    ["02", "Collect repeated answers", "Aelo asks each plan-approved assistant four times. Returned answers and provider failures remain part of the record.", "The denominator never disappears."],
    ["03", "Open the evidence", "Inspect where your brand appeared, which names appeared beside it, and which URLs came through structured provider citations.", "Mentioned links remain separate from citations."],
    ["04", "Choose one investigation", "Aelo ranks a prompt or source gap and keeps the reason beside the task. It does not promise that the work will earn a mention.", "Every action points back to evidence."],
    ["05", "Measure again fairly", "A follow-up is compared only when prompt, engine, model, region, mode, search, scorer and sampling conditions still match.", "Changed evidence produces an inconclusive verdict."],
] as const;

export default function ProductPage() {
    return (
        <div className="bg-[#e9ece7] text-[#1d2523]">
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={[{ label: "Product", path: "/product" }]} />

            <MarketingHero eyebrow="How Aelo works" title="From one buyer question to one decision you can defend." copy={<p>Most trackers stop at a score. Aelo keeps the answers behind it, shows what the evidence can support, and gives your team one bounded next investigation.</p>} actions={<MarketingCTA href="/#scan" inverted>Run one real answer</MarketingCTA>} />

            <section className="px-4 py-20 md:px-6 md:py-28">
                <div className="mx-auto max-w-6xl">
                    <MarketingSectionHeading eyebrow="The measurement path" title="Five stages. One evidence trail." copy={<p>Each stage adds context without breaking the link to the answer that produced it.</p>} />
                    <div className="mt-12 border-t border-[#bbc4bc]">
                        {STEPS.map(([number, title, copy, proof]) => (
                            <article key={number} className="grid gap-5 border-b border-[#bbc4bc] py-8 md:grid-cols-[56px_1fr_.62fr] md:items-start">
                                <p className="font-mono text-xs text-[#416a88]">{number}</p>
                                <div><h2 className="text-2xl font-semibold tracking-tight">{title}</h2><p className="mt-3 max-w-2xl text-base leading-relaxed text-[#53615d]">{copy}</p></div>
                                <p className="border-l-2 border-[#a8cbe0] pl-4 text-sm font-semibold leading-relaxed text-[#315873]">{proof}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
                    <MarketingSectionHeading light eyebrow="One contract" title="The dashboard, API and MCP read the same evidence." copy={<p>Convex binds every protected read and write to a workspace, runs durable measurement work, and stores large raw receipts without asking the interface to invent a second version of the truth.</p>} />
                    <div className="grid gap-px border border-[#343c3b] bg-[#343c3b] sm:grid-cols-2">
                        {[["Durable work", "Retries do not quietly reserve the same quota twice."], ["Workspace boundaries", "Roles and membership are checked on the server."], ["Inspectable receipts", "Answers, failures and structured citations remain retrievable."], ["Compatible follow-ups", "Changed measurement conditions cannot become a lift claim."]].map(([title, copy]) => (
                            <article key={title} className="bg-[#181d1d] p-6"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-[#a4aeaa]">{copy}</p></article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
                    <MarketingSectionHeading eyebrow="What reaches the screen" title="The receipt survives the summary." />
                    <EvidencePanel eyebrow="Measurement receipt / sample 04" title="What are the best project wikis for an engineering team?">
                        <p className="text-base leading-relaxed text-[#3f4947]">Answer text stays readable. Provider citations remain attached. A missing or failed sample stays missing or failed.</p>
                        <div className="mt-7 grid gap-4 border-t border-[#d2d7cf] pt-5 sm:grid-cols-3">
                            <Fact label="Observed" value="3 / 4 mentions" /><Fact label="Confidence" value="Low" /><Fact label="State" value="Partial" />
                        </div>
                        <p className="mt-5 text-xs text-[#586560]">Illustrative structure, not a customer result.</p>
                    </EvidencePanel>
                </div>
            </section>

            <section className="bg-[#a8cbe0] px-4 py-24 md:px-6 md:py-28">
                <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 lg:flex-row lg:items-end">
                    <div><p className="font-mono text-xs uppercase tracking-widest text-[#315873]">Start with the evidence</p><h2 className="mt-4 max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Ask one real question. Keep the answer.</h2></div>
                    <MarketingCTA href="/#scan">Run one real answer</MarketingCTA>
                </div>
            </section>
        </div>
    );
}

function Fact({ label, value }: { label: string; value: string }) {
    return <div><p className="font-mono text-xs uppercase tracking-widest text-[#586560]">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>;
}
