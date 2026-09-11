import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { BreadcrumbJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/structured-data";

export const metadata: Metadata = {
    title: "Aelo pricing · Start with a real AI answer",
    description: "Start with three free Gemini scans each week. Paid plans add four engine measurement, recurring scans and team workflows.",
};

const PLANS = [
    {
        name: "Free",
        price: "₹0",
        note: "No card",
        summary: "See one real answer before you commit.",
        href: "/#scan",
        cta: "Run a real scan",
        color: "bg-white",
        features: ["Three Gemini scans each week", "One tracked brand", "Raw answer and public receipt", "Provider source evidence when available"],
    },
    {
        name: "Radar",
        price: "₹4,999",
        note: "each month",
        summary: "Watch how your brand appears across assistants.",
        href: "/signup?plan=radar",
        cta: "Start with Radar",
        color: "bg-[#dff7f1]",
        features: ["ChatGPT, Gemini, Claude and Perplexity access", "Recurring measurements", "Confidence and sample counts", "Citation and source views", "Up to two team members"],
    },
    {
        name: "Command",
        price: "₹14,999",
        note: "each month",
        summary: "Turn measurement gaps into assigned work.",
        href: "/signup?plan=command",
        cta: "Start with Command",
        color: "bg-[#eeeaff]",
        featured: true,
        features: ["Everything in Radar", "Larger operating limits", "Actions and follow up receipts", "Decision reports", "Up to five team members", "Priority support"],
    },
    {
        name: "Concierge",
        price: "From ₹50,000",
        note: "each month",
        summary: "Add hands on strategy and delivery support.",
        href: "/contact",
        cta: "Talk to Aelo",
        color: "bg-[#fff5c8]",
        features: ["Everything in Command", "Dedicated strategy support", "Custom prompt research", "Leadership ready reporting", "Up to fifteen team members", "Security review support"],
    },
];

const FAQ = [
    ["Can I see a result before paying?", "Yes. The public scan asks Gemini one real buyer question and returns a shareable receipt. A free account supports three Gemini scans each week."],
    ["Which assistants are included on paid plans?", "Paid organizations can run ChatGPT, Gemini, Claude and Perplexity when each provider is available. Aelo reports unavailable engines instead of replacing them with data from another model."],
    ["Do failed scans use up a result?", "A provider failure remains recorded as a failure. It does not become a zero visibility score. Quota reservation is designed to stay safe during retries and repeated requests."],
    ["Can we pay in Indian rupees?", "Yes. The listed prices use Indian rupees and Razorpay. Stripe supports configured global checkout options."],
    ["Can we cancel?", "Plans are billed in advance and cancellation takes effect at the end of the current billing period. See the terms page for the complete policy."],
    ["Why does Aelo show sample counts?", "AI answers change between runs. The sample count tells you how much observed evidence sits behind a result, so a single lucky mention does not look dependable."],
];

export default function PricingPage() {
    return (
        <div className="bg-[#f7f8ff] text-[#111936]">
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={[{ label: "Pricing", path: "/pricing" }]} />

            <section className="px-4 pb-20 pt-16 md:px-6 md:pb-24 md:pt-24">
                <div className="mx-auto max-w-6xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">Pricing</p>
                    <h1 className="mx-auto mt-5 max-w-[680px] bg-gradient-to-r from-[#111936] to-[#615f8c] bg-clip-text text-5xl font-semibold tracking-tight text-transparent md:text-7xl">Start with one answer. Pay when the work grows.</h1>
                    <p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed text-[#58627d]">No card for the free scan. Paid plans add more assistants, recurring measurement and team workflows.</p>
                </div>
            </section>

            <section className="px-4 pb-24 md:px-6 md:pb-32">
                <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {PLANS.map((plan) => (
                        <article key={plan.name} className={`relative flex flex-col rounded-3xl border p-6 ${plan.featured ? "border-[#6d63f7] shadow-[0_24px_70px_rgba(49,55,124,0.14)]" : "border-[#d9def0]"} ${plan.color}`}>
                            {plan.featured ? <span className="mb-4 w-fit rounded-full bg-[#6d63f7] px-3 py-2 text-xs font-semibold text-white">Best for active teams</span> : null}
                            <p className="text-sm font-semibold uppercase tracking-widest text-[#66708b]">{plan.name}</p>
                            <div className="mt-5"><p className="text-3xl font-semibold tracking-tight">{plan.price}</p><p className="mt-1 text-xs text-[#77819d]">{plan.note}</p></div>
                            <p className="mt-5 min-h-12 text-sm leading-relaxed text-[#58627d]">{plan.summary}</p>
                            <div className="my-6 h-px bg-[#111936]/10" />
                            <ul className="flex-1 space-y-3">
                                {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm leading-relaxed"><Check className="mt-0.5 size-4 shrink-0 text-[#148c78]" />{feature}</li>)}
                            </ul>
                            <Link href={plan.href} className={plan.featured ? "mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6d63f7] px-4 py-2 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1" : "mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#111936] px-4 py-2 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"}>{plan.cta}<ArrowRight className="size-4" /></Link>
                        </article>
                    ))}
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-[#77819d]">Prices shown in Indian rupees. Provider availability is reported per scan. Taxes may apply.</p>
            </section>

            <section className="bg-[#111936] px-4 py-24 text-white md:px-6 md:py-32">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                        <div><p className="text-sm font-semibold uppercase tracking-widest text-[#8de6d1]">Included by design</p><h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">No plan can buy a prettier lie.</h2></div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[['Failures stay visible', 'A provider outage never becomes a zero score.'], ['Evidence stays attached', 'Open the answers and source URLs behind the summary.'], ['Authorization stays server side', 'Workspace roles and plan access are checked before protected work.'], ['Comparisons stay compatible', 'Changed measurement conditions produce an inconclusive verdict.']].map(([title, copy], index) => <article key={title} className={index === 0 ? "rounded-2xl bg-[#8de6d1] p-5 text-[#103f3a]" : index === 1 ? "rounded-2xl bg-[#eeeaff] p-5 text-[#312c74]" : index === 2 ? "rounded-2xl bg-[#fff5c8] p-5 text-[#4c4512]" : "rounded-2xl bg-[#ff9d8f] p-5 text-[#57251f]"}><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed opacity-75">{copy}</p></article>)}
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto max-w-4xl">
                    <div className="text-center"><p className="text-sm font-semibold uppercase tracking-widest text-[#5d53e8]">Before you choose</p><h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">Straight answers about the plans.</h2></div>
                    <div className="mt-12 space-y-3">
                        {FAQ.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-[#d9def0] bg-white p-5 open:border-[#aaa3ff]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold"><span>{question}</span><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eeeaff] text-[#5d53e8] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-45">+</span></summary><p className="max-w-3xl pt-4 text-base leading-relaxed text-[#58627d]">{answer}</p></details>)}
                    </div>
                </div>
            </section>
        </div>
    );
}
