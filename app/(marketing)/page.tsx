import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EvidenceSequence } from "@/components/marketing/evidence-sequence";
import { FreeScanWidget } from "@/components/marketing/free-scan-widget";
import { WordReveal } from "@/components/marketing/word-reveal";

export const metadata: Metadata = {
    title: "Aelo · Know what AI says about your brand",
    description: "Measure how ChatGPT, Gemini, Claude and Perplexity answer about your brand. Inspect repeated samples, confidence ranges and real provider citations.",
};

const ENGINES = ["ChatGPT", "Gemini", "Claude", "Perplexity"];

const FAQ = [
    ["Is this another SEO score?", "No. Aelo asks AI assistants real buyer questions, keeps each answer and reports how often your brand appeared. The score only summarizes those observed samples."],
    ["Why ask the same question more than once?", "AI answers vary. Repeating a prompt shows whether a mention is dependable or a lucky answer. Every result includes its sample count and confidence range."],
    ["Does every URL count as a citation?", "No. Aelo separates citations supplied by the provider from links that appear only inside generated text. You can inspect that distinction in the receipt."],
    ["What happens when a provider fails?", "The sample stays failed and the result becomes partial or unavailable. Aelo does not turn missing evidence into a zero or an invented response."],
    ["Which assistants can Aelo measure?", "Aelo is built for ChatGPT, Gemini, Claude and Perplexity. Each receipt shows which engines responded because access can differ by plan and provider status."],
    ["Can my team act on the findings?", "Yes. Aelo groups missed prompts, source gaps and competitor mentions into a ranked action queue, then compares the follow up against compatible samples."],
];

export default function LandingPage() {
    return (
        <div className="overflow-hidden bg-[#e9ece7] text-[#1d2523]">
            <section className="bg-[#131717] px-4 pb-20 pt-20 text-[#eff2ec] md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-[#343c3b] pb-4 font-mono text-xs uppercase tracking-widest text-[#7c8985]">
                        <span>AI visibility, with receipts</span>
                        <span className="flex flex-wrap gap-x-5 gap-y-2">
                            {ENGINES.map((engine, index) => <span key={engine}><span className="mr-2 text-[#a8cbe0]">0{index + 1}</span>{engine}</span>)}
                        </span>
                    </div>

                    <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,.98fr)]">
                        <div>
                            <h1 className="max-w-[680px] bg-gradient-to-r from-white to-[#9b9b9b] bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">
                                Don’t guess how AI describes your brand.
                            </h1>
                            <p className="mt-6 max-w-[680px] text-lg leading-relaxed text-[#a4aeaa]">
                                Ask the buyer questions that decide your shortlist. Aelo repeats them across AI assistants, then keeps every answer, source and confidence range.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-5">
                                <Link href="#scan" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-[#a8cbe0] px-4 py-2 text-base font-semibold text-[#17201f] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#bdd9e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eff2ec] focus-visible:ring-offset-4 focus-visible:ring-offset-[#131717]">
                                    Run one real answer <ArrowRight className="size-4" />
                                </Link>
                                <p className="font-mono text-xs uppercase tracking-widest text-[#7c8985]">Gemini · 3 free scans each week · no card</p>
                            </div>
                        </div>

                        <div id="scan" className="relative scroll-mt-24 lg:pl-6">
                            <div aria-hidden="true" className="absolute inset-x-10 bottom-[-16px] top-6 border border-[#343c3b] bg-[#202626]" />
                            <div className="relative"><FreeScanWidget /></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-20 md:px-6 md:py-24">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
                    <div className="lg:sticky lg:top-28">
                        <p className="font-mono text-xs uppercase tracking-widest text-[#586560]">The proof, not the pitch</p>
                        <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight md:text-5xl">One buyer question. Sixteen answers you can open.</h2>
                        <p className="mt-5 max-w-md text-base leading-relaxed text-[#53615d]">A summary is only useful when your team can challenge it. Every percentage leads back to the prompt, answer, model, sample and returned source evidence.</p>
                        <Link href="/methodology" className="mt-8 inline-flex min-h-11 items-center gap-2 text-base font-semibold text-[#315873] underline decoration-[#8fb0c3] underline-offset-4 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:decoration-[#315873]">Read the method <ArrowRight className="size-4" /></Link>
                    </div>

                    <EvidenceSequence />
                </div>
            </section>

            <section className="bg-[#dbe8ee] px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-8 font-mono text-xs uppercase tracking-widest text-[#416a88]">Why repeated answers matter</p>
                    <WordReveal className="max-w-[680px] text-4xl font-semibold leading-tight tracking-tight text-[#1d2523] md:text-6xl">
                        One answer can flatter you. Twelve answers can tell you something.
                    </WordReveal>
                </div>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
                        <div>
                            <p className="font-mono text-xs uppercase tracking-widest text-[#a8cbe0]">From question to decision</p>
                            <h2 className="mt-4 max-w-md text-4xl font-semibold tracking-tight md:text-5xl">Measure. Inspect. Choose one move.</h2>
                        </div>
                        <div className="grid border-t border-[#343c3b] sm:grid-cols-3">
                            <Step number="01" title="Ask" body="Choose the buyer questions that shape your shortlist. Edit every prompt before it runs." />
                            <Step number="02" title="Sample" body="Repeat each question across available assistants. Keep failures visible and out of the score." />
                            <Step number="03" title="Act" body="Find the prompt and source gap worth attention. Give your team one ranked next move." />
                        </div>
                    </div>

                    <div className="mt-24 grid gap-10 border-t border-[#343c3b] pt-12 lg:grid-cols-2">
                        <div><p className="font-mono text-xs uppercase tracking-widest text-[#7c8985]">What you can defend</p><h3 className="mt-4 text-3xl font-semibold tracking-tight">A visibility number with its uncertainty attached.</h3><p className="mt-4 max-w-xl text-base leading-relaxed text-[#a4aeaa]">Sample count and confidence stay beside every score. Comparisons only appear when prompt, engine, model, region and method still match.</p></div>
                        <div><p className="font-mono text-xs uppercase tracking-widest text-[#7c8985]">What you can inspect</p><h3 className="mt-4 text-3xl font-semibold tracking-tight">The sources assistants actually returned.</h3><p className="mt-4 max-w-xl text-base leading-relaxed text-[#a4aeaa]">Provider citations remain separate from links found only in generated prose. Aelo shows the difference instead of inflating the evidence.</p></div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.65fr_1.35fr]">
                    <div>
                        <p className="font-mono text-xs uppercase tracking-widest text-[#416a88]">Questions worth asking</p>
                        <h2 className="mt-4 max-w-sm text-4xl font-semibold tracking-tight md:text-5xl">What an honest tracker should explain.</h2>
                    </div>
                    <div className="border-t border-[#bbc4bc]">
                        {FAQ.map(([question, answer]) => (
                            <details key={question} className="group border-b border-[#bbc4bc] py-5">
                                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold"><span>{question}</span><span className="flex size-8 shrink-0 items-center justify-center text-[#416a88] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45">+</span></summary>
                                <p className="max-w-3xl pb-2 pt-4 text-base leading-relaxed text-[#53615d]">{answer}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-[#a8cbe0] px-4 py-24 text-[#17201f] md:px-6 md:py-32">
                <div className="mx-auto flex max-w-6xl flex-col justify-between gap-10 lg:flex-row lg:items-end">
                    <div><p className="font-mono text-xs uppercase tracking-widest text-[#294f69]">One question. Real evidence.</p><h2 className="mt-4 max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Your buyers are already asking. Read the answer.</h2></div>
                    <Link href="#scan" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm bg-[#131717] px-4 py-2 text-base font-semibold text-[#eff2ec] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#202626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#131717] focus-visible:ring-offset-4 focus-visible:ring-offset-[#a8cbe0]">Run one real answer <ArrowRight className="size-4" /></Link>
                </div>
            </section>
        </div>
    );
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
    return <article className="border-b border-[#343c3b] py-8 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
        <p className="font-mono text-xs text-[#7c8985]">{number}</p>
        <h3 className="mt-8 text-2xl font-semibold">{title}</h3>
        <p className="mt-4 text-sm leading-relaxed text-[#a4aeaa]">{body}</p>
    </article>;
}
