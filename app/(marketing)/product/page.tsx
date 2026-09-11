import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CircleDot, FileSearch, ListChecks, ScanSearch, ShieldCheck } from "lucide-react";

import { BreadcrumbJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/structured-data";

export const metadata: Metadata = {
    title: "How Aelo works · From AI answer to evidence",
    description: "Aelo repeats real buyer prompts across AI assistants, keeps the evidence and turns visibility gaps into work your team can measure again.",
};

const STEPS = [
    {
        number: "01",
        icon: CircleDot,
        title: "Start with buyer questions",
        copy: "Choose the questions that decide whether your brand enters the shortlist. Aelo starts onboarding with three to five editable prompts, not a generic keyword dump.",
        proof: "Prompt text and version stay attached to every result",
        color: "bg-[#eeeaff]",
        iconColor: "bg-[#6d63f7] text-white",
    },
    {
        number: "02",
        icon: ScanSearch,
        title: "Ask more than once",
        copy: "Aelo repeats each prompt across the assistants your plan can access. Every returned answer, provider failure, model and region remains part of the measurement record.",
        proof: "Sample counts travel with the number",
        color: "bg-[#dff7f1]",
        iconColor: "bg-[#148c78] text-white",
    },
    {
        number: "03",
        icon: FileSearch,
        title: "Open the evidence",
        copy: "See where your brand appeared, which competitors appeared first and which URLs the provider supplied as citations. Links found only inside prose stay clearly separate.",
        proof: "Provider citations and mentioned links never merge",
        color: "bg-[#fff0ed]",
        iconColor: "bg-[#ff806e] text-[#57251f]",
    },
    {
        number: "04",
        icon: ListChecks,
        title: "Choose one useful move",
        copy: "Aelo groups missed prompts, recurring source gaps and competitor wins into a ranked action queue. Each action keeps its owner, status and evidence history.",
        proof: "The action points back to the prompt it should affect",
        color: "bg-[#fff5c8]",
        iconColor: "bg-[#efd631] text-[#4c4512]",
    },
    {
        number: "05",
        icon: ShieldCheck,
        title: "Measure again without moving the goalposts",
        copy: "A follow up compares compatible prompt, engine, model, region, mode and scoring versions. If evidence is missing or changed, the verdict is inconclusive instead of improved.",
        proof: "Improved, unchanged, regressed or inconclusive",
        color: "bg-[#e9efff]",
        iconColor: "bg-[#4d73d5] text-white",
    },
];

export default function ProductPage() {
    return (
        <div className="bg-[#f7f8ff] text-[#111936]">
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={[{ label: "Product", path: "/product" }]} />

            <section className="px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.78fr] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">How Aelo works</p>
                        <h1 className="mt-5 max-w-[680px] bg-gradient-to-r from-[#111936] to-[#615f8c] bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">From one buyer question to one defensible move.</h1>
                    </div>
                    <div className="lg:pb-2">
                        <p className="max-w-[680px] text-lg leading-relaxed text-[#58627d]">Most tools stop at a score. Aelo keeps the answer, explains what the evidence can support and gives your team a specific gap to work on.</p>
                        <Link href="/#scan" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#6d63f7] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#5d53e8]">Run a real scan <ArrowRight className="size-4" /></Link>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-24 md:px-6 md:pb-32">
                <div className="mx-auto max-w-6xl space-y-4">
                    {STEPS.map((step, index) => (
                        <article key={step.number} className={`grid gap-8 rounded-3xl p-6 md:grid-cols-[88px_1fr_0.72fr] md:items-center md:p-8 lg:p-10 ${step.color}`}>
                            <div className="flex items-center gap-3 md:block">
                                <div className={`flex size-12 items-center justify-center rounded-2xl ${step.iconColor}`}><step.icon className="size-6" /></div>
                                <p className="mt-0 text-xs font-semibold tracking-widest text-[#66708b] md:mt-4">{step.number}</p>
                            </div>
                            <div>
                                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{step.title}</h2>
                                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#58627d]">{step.copy}</p>
                            </div>
                            <div className="rounded-2xl bg-white/70 p-5">
                                <p className="flex items-start gap-3 text-sm font-semibold leading-relaxed"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#111936] text-white"><Check className="size-3.5" /></span>{step.proof}</p>
                                {index === STEPS.length - 1 ? <Link href="/methodology" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#5d53e8]">Read the comparison rules <ArrowRight className="size-4" /></Link> : null}
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="bg-[#111936] px-4 py-24 text-white md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="max-w-[680px]"><p className="text-sm font-semibold uppercase tracking-widest text-[#8de6d1]">Built around the evidence</p><h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">The architecture protects the promise.</h2><p className="mt-5 text-lg leading-relaxed text-white/60">Convex stores the product data, enforces workspace access and runs durable measurement work. The public API and MCP server use scoped keys against the same evidence.</p></div>
                    <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {[['Durable work', 'Samples can retry without quietly charging quota twice.'], ['Workspace boundaries', 'Roles and membership are checked on the server.'], ['Full receipts', 'Large raw evidence stays retrievable from file storage.'], ['One backend', 'Dashboard, API and MCP read the same measurement contract.']].map(([title, copy], index) => <article key={title} className={index === 0 ? "rounded-2xl bg-[#8de6d1] p-5 text-[#103f3a]" : index === 1 ? "rounded-2xl bg-[#eeeaff] p-5 text-[#312c74]" : index === 2 ? "rounded-2xl bg-[#fff5c8] p-5 text-[#4c4512]" : "rounded-2xl bg-[#ff9d8f] p-5 text-[#57251f]"}><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed opacity-75">{copy}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="bg-[#dff7f1] px-4 py-24 text-center md:px-6 md:py-32">
                <h2 className="mx-auto max-w-[680px] text-4xl font-semibold tracking-tight md:text-6xl">Start with the answer. Keep the receipt.</h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-[#386b64]">Run one real Gemini scan without creating an account.</p>
                <Link href="/#scan" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111936] px-5 py-3 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">See the real answer <ArrowRight className="size-4" /></Link>
            </section>
        </div>
    );
}
