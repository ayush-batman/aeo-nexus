import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleDot, Link2, Search, ShieldCheck, Sparkles } from "lucide-react";

import { FreeScanWidget } from "@/components/marketing/free-scan-widget";
import { WordReveal } from "@/components/marketing/word-reveal";

export const metadata: Metadata = {
    title: "Aelo · See what AI tells your buyers",
    description: "Run repeated AI visibility scans with confidence, sample counts and real source evidence. See what ChatGPT, Gemini, Claude and Perplexity say about your brand.",
};

const ENGINE_ROWS = [
    { name: "ChatGPT", result: "Mentioned in 3 of 4", color: "bg-[#8de6d1]", width: "w-3/4" },
    { name: "Gemini", result: "Mentioned in 2 of 4", color: "bg-[#f6e76b]", width: "w-1/2" },
    { name: "Claude", result: "Mentioned in 1 of 4", color: "bg-[#ff9d8f]", width: "w-1/4" },
    { name: "Perplexity", result: "Mentioned in 3 of 4", color: "bg-[#aaa3ff]", width: "w-3/4" },
];

const FAQ = [
    ["Is this another SEO score?", "No. Aelo asks AI assistants real buyer questions, keeps each answer and reports how often your brand appeared. The score is a summary of those observed samples."],
    ["Why run the same question more than once?", "AI answers vary. Repeating a prompt shows whether a mention is dependable or a lucky answer. Every result includes its sample count and confidence."],
    ["Do you count every URL in an answer as a citation?", "No. Aelo separates provider supplied citations from links that only appear inside generated text. The distinction stays visible in the receipt."],
    ["What happens when an AI provider fails?", "The sample is marked failed and the result becomes partial or unavailable. Aelo does not replace missing evidence with a zero or invented response."],
    ["Which assistants can Aelo measure?", "Aelo is built for ChatGPT, Gemini, Claude and Perplexity. Availability is reported on every scan because access can differ by plan and provider status."],
    ["Can my team act on the findings?", "Yes. Aelo groups missed prompts, source gaps and competitor mentions into a ranked action queue, then compares the follow up against compatible samples."],
];

export default function LandingPage() {
    return (
        <div className="overflow-hidden bg-[#f7f8ff] text-[#111936]">
            <section className="px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
                    <div>
                        <div className="mb-6 flex flex-wrap gap-2">
                            {["ChatGPT", "Gemini", "Claude", "Perplexity"].map((engine, index) => (
                                <span key={engine} className={index === 0 ? "rounded-full bg-[#dff7f1] px-3 py-2 text-xs font-semibold text-[#17695d]" : index === 1 ? "rounded-full bg-[#fff5c8] px-3 py-2 text-xs font-semibold text-[#6e6119]" : index === 2 ? "rounded-full bg-[#fff0ed] px-3 py-2 text-xs font-semibold text-[#873c34]" : "rounded-full bg-[#eeeaff] px-3 py-2 text-xs font-semibold text-[#5048a7]"}>
                                    {engine}
                                </span>
                            ))}
                        </div>

                        <h1 className="max-w-[680px] bg-gradient-to-r from-[#111936] to-[#615f8c] bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">
                            See the answer before your buyer does.
                        </h1>
                        <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-[#58627d]">
                            Aelo asks AI assistants the questions that decide your shortlist. You get repeated samples, confidence and every real source, followed by one clear move to improve.
                        </p>

                        <div className="mt-8 grid gap-3 text-sm text-[#303b5c] sm:grid-cols-2">
                            <p className="flex items-center gap-2"><Check className="size-4 text-[#148c78]" /> Every answer stays inspectable</p>
                            <p className="flex items-center gap-2"><Check className="size-4 text-[#148c78]" /> Failed scans stay failed</p>
                            <p className="flex items-center gap-2"><Check className="size-4 text-[#148c78]" /> Confidence includes sample count</p>
                            <p className="flex items-center gap-2"><Check className="size-4 text-[#148c78]" /> Source URLs stay attached</p>
                        </div>
                    </div>

                    <div id="scan" className="scroll-mt-28">
                        <FreeScanWidget />
                        <p className="mt-4 text-center text-xs text-[#77819d]">The free scan uses Gemini. Your receipt opens in a shareable page.</p>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20 md:px-6 md:pb-24">
                <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#111936] p-4 text-white shadow-[0_36px_100px_rgba(17,25,54,0.24)] md:p-8">
                    <div className="mb-6 flex flex-col gap-3 px-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-[#8de6d1]">Illustrative evidence view</p>
                            <h2 className="mt-2 text-2xl font-semibold md:text-3xl">One buyer question. Sixteen observed answers.</h2>
                        </div>
                        <span className="w-fit rounded-full bg-white/10 px-3 py-2 text-xs text-white/65">Example structure, not a customer result</span>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-2xl bg-white p-4 text-[#111936] md:p-6">
                            <div className="flex items-start gap-3 border-b border-[#dfe3f2] pb-5">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eeeaff]"><Search className="size-5 text-[#5d53e8]" /></div>
                                <div><p className="text-xs font-semibold uppercase tracking-widest text-[#77819d]">Buyer prompt</p><p className="mt-1 text-lg font-semibold">Which project wiki is best for an engineering team?</p></div>
                            </div>
                            <div className="mt-5 space-y-5">
                                {ENGINE_ROWS.map((engine) => (
                                    <div key={engine.name} className="grid gap-2 sm:grid-cols-[108px_1fr_132px] sm:items-center">
                                        <p className="text-sm font-semibold">{engine.name}</p>
                                        <div className="h-3 overflow-hidden rounded-full bg-[#eef0f7]"><div className={`h-full rounded-full ${engine.color} ${engine.width}`} /></div>
                                        <p className="text-xs text-[#66708b] sm:text-right">{engine.result}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <div className="rounded-2xl bg-[#8de6d1] p-5 text-[#103f3a]">
                                <p className="text-xs font-semibold uppercase tracking-widest">Visibility receipt</p>
                                <div className="mt-6 flex items-end gap-3"><span className="text-6xl font-semibold tracking-tight">9</span><span className="pb-2 text-sm">mentions from<br />16 samples</span></div>
                                <p className="mt-5 rounded-xl bg-white/40 px-3 py-2 text-sm font-semibold">Confidence: moderate</p>
                            </div>
                            <div className="rounded-2xl bg-[#f6e76b] p-5 text-[#4c4512]">
                                <p className="text-xs font-semibold uppercase tracking-widest">Next useful move</p>
                                <p className="mt-4 text-lg font-semibold">Earn a comparison page mention from the sources these assistants already trust.</p>
                                <div className="mt-5 flex items-center gap-2 text-sm"><Link2 className="size-4" /> 7 provider citations kept</div>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="bg-[#dff7f1] px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-8 text-sm font-semibold uppercase tracking-widest text-[#147667]">Why repeated answers matter</p>
                    <WordReveal className="max-w-[680px] text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                        One answer can flatter you. Twelve answers can tell you something.
                    </WordReveal>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-[680px]">
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">From question to decision</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">The shortest path from “Are we visible?” to “Do this next.”</h2>
                    </div>

                    <div className="mt-12 grid gap-4 lg:grid-cols-3">
                        <article className="rounded-3xl bg-[#eeeaff] p-8">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#6d63f7] text-white"><CircleDot className="size-6" /></div>
                            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[#5d53e8]">Measure</p>
                            <h3 className="mt-3 text-2xl font-semibold">Ask the questions that create your shortlist.</h3>
                            <p className="mt-4 text-base leading-relaxed text-[#58627d]">Choose editable buyer prompts. Aelo repeats them across every available assistant and keeps the raw answer.</p>
                        </article>
                        <article className="rounded-3xl bg-[#fff0ed] p-8">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#ff806e] text-[#57251f]"><ShieldCheck className="size-6" /></div>
                            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[#9b463b]">Understand</p>
                            <h3 className="mt-3 text-2xl font-semibold">Know whether the signal is dependable.</h3>
                            <p className="mt-4 text-base leading-relaxed text-[#6e5855]">Sample counts, confidence, provider evidence and partial failures explain exactly what the number can support.</p>
                        </article>
                        <article className="rounded-3xl bg-[#fff5c8] p-8">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f1d935] text-[#554b0a]"><Sparkles className="size-6" /></div>
                            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-[#746617]">Improve</p>
                            <h3 className="mt-3 text-2xl font-semibold">Work on the gap most likely to move an answer.</h3>
                            <p className="mt-4 text-base leading-relaxed text-[#6b643c]">See which sources already shape the category, where competitors win and which prompt deserves attention first.</p>
                        </article>
                    </div>
                </div>
            </section>

            <section className="bg-[#e9efff] px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
                    <div className="max-w-[680px]">
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">The receipt is the product</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Trust the number because you can open it.</h2>
                        <p className="mt-5 text-lg leading-relaxed text-[#58627d]">Every summary leads back to the prompt, returned answer, engine, model, sample count and source evidence behind it.</p>
                        <Link href="/methodology" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111936] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">Read the method <ArrowRight className="size-4" /></Link>
                    </div>

                    <div className="rounded-3xl border border-[#c9d4f5] bg-white p-5 shadow-[0_24px_70px_rgba(49,55,124,0.1)] md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe3f2] pb-5">
                            <div><p className="text-xs font-semibold uppercase tracking-widest text-[#77819d]">Evidence ledger</p><p className="mt-1 text-lg font-semibold">Sources observed across returned samples</p></div>
                            <span className="rounded-full bg-[#dff7f1] px-3 py-2 text-xs font-semibold text-[#17695d]">Provider evidence</span>
                        </div>
                        <div className="divide-y divide-[#e6e9f3]">
                            {["g2.com/categories/knowledge-base", "zapier.com/blog/best-wiki-software", "notion.com/help/guides"].map((source, index) => (
                                <div key={source} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                                    <div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eeeaff] text-sm font-semibold text-[#5d53e8]">{index + 1}</span><span className="truncate text-sm font-medium">{source}</span></div>
                                    <span className="text-xs text-[#77819d]">Observed in {4 - index} samples</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-[#77819d]">Illustrative source layout. A live receipt displays only evidence returned by the provider.</p>
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center">
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">Questions worth asking</p>
                        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">What an honest measurement tool should explain.</h2>
                    </div>
                    <div className="mt-12 space-y-3">
                        {FAQ.map(([question, answer]) => (
                            <details key={question} className="group rounded-2xl border border-[#d9def0] bg-white p-5 open:border-[#aaa3ff]">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold"><span>{question}</span><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eeeaff] text-[#5d53e8] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45">+</span></summary>
                                <p className="max-w-3xl pt-4 text-base leading-relaxed text-[#58627d]">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#ff9d8f] px-4 py-24 text-[#44201c] md:px-6 md:py-32">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">Your buyers are already asking. See the answer.</h2>
                    <p className="mx-auto mt-5 max-w-xl text-lg text-[#6e3932]">Run one real Gemini scan. No signup, no card and no invented result when the provider fails.</p>
                    <Link href="#scan" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111936] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">Run a real scan <ArrowRight className="size-4" /></Link>
                </div>
            </section>
        </div>
    );
}
