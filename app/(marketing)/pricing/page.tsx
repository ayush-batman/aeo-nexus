import type { Metadata } from "next";
import { Check } from "lucide-react";

import { MarketingCTA, MarketingHero, MarketingSectionHeading } from "@/components/marketing/page-primitives";
import { BreadcrumbJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/structured-data";
import { PUBLIC_PLANS } from "@/lib/billing/plan-catalog";

export const metadata: Metadata = {
    title: "Aelo pricing · Start with a real AI answer",
    description: "Start with three free Gemini scans each week. Paid plans add more engines, recurring scans and team workflows.",
};

const FAQ = [
    ["Can I see a result before paying?", "Yes. The public scan asks Gemini one real buyer question and returns a shareable receipt. Failed requests stay failed."],
    ["Which assistants are included?", "Paid organizations can access ChatGPT, Gemini, Claude and Perplexity when the provider is configured and available. Every scan reports which engines answered."],
    ["Do failed scans become zero visibility?", "No. Provider failures are recorded separately from successful non-mentions. Quota reservations are also protected against duplicate retries."],
    ["Can we pay in Indian rupees?", "The listed plans use Indian rupees and Razorpay. Stripe handles configured global checkout options."],
    ["Why show sample counts?", "AI answers vary. The denominator and confidence range show how much observed evidence sits behind the percentage."],
] as const;

export default function PricingPage() {
    return (
        <div className="bg-[#e9ece7] text-[#1d2523]">
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={[{ label: "Pricing", path: "/pricing" }]} />

            <MarketingHero tone="light" eyebrow="Pricing" title="Start with one answer. Pay when the work becomes recurring." copy={<p>The free scan needs no card. Paid plans add more assistants, scheduled measurement, shared investigations and decision reports.</p>} />

            <section className="px-4 pb-24 md:px-6 md:pb-32">
                <div className="mx-auto max-w-6xl border-y border-[#bbc4bc]">
                    <div className="grid lg:grid-cols-4">
                        {PUBLIC_PLANS.map((plan) => {
                            const href = plan.checkoutKey ? `/signup?plan=${plan.checkoutKey}` : "/#scan";
                            const cta = plan.checkoutKey ? `Choose ${plan.name}` : "Run one real answer";
                            return (
                            <article key={plan.name} className={`relative flex flex-col border-b border-[#bbc4bc] p-6 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 ${plan.featured ? "bg-[#131717] text-[#eff2ec]" : ""}`}>
                                {plan.featured ? <span className="mb-5 w-fit border-l-2 border-[#a8cbe0] pl-3 font-mono text-xs uppercase tracking-widest text-[#a8cbe0]">For active teams</span> : null}
                                <p className={`font-mono text-xs uppercase tracking-widest ${plan.featured ? "text-[#a4aeaa]" : "text-[#586560]"}`}>{plan.name}</p>
                                <p className="mt-6 text-3xl font-semibold tracking-tight">{plan.priceLabel}</p>
                                <p className={`mt-1 text-xs ${plan.featured ? "text-[#7c8985]" : "text-[#586560]"}`}>{plan.billingNote}</p>
                                <p className={`mt-6 min-h-16 text-sm leading-relaxed ${plan.featured ? "text-[#a4aeaa]" : "text-[#53615d]"}`}>{plan.summary}</p>
                                <ul className={`mt-6 flex-1 space-y-3 border-t pt-6 ${plan.featured ? "border-[#343c3b]" : "border-[#bbc4bc]"}`}>
                                    {[plan.scanPromise, ...plan.features].map((feature) => <li key={feature} className="flex items-start gap-2 text-sm leading-relaxed"><Check aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${plan.featured ? "text-[#a8cbe0]" : "text-[#416a88]"}`} />{feature}</li>)}
                                </ul>
                                <div className="mt-8"><MarketingCTA href={href} inverted={plan.featured}>{cta}</MarketingCTA></div>
                            </article>
                            );
                        })}
                    </div>
                </div>
                <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-[#586560]">Prices shown in Indian rupees. Taxes may apply. Provider availability is reported on every scan.</p>
            </section>

            <section className="bg-[#131717] px-4 py-24 text-[#eff2ec] md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
                    <MarketingSectionHeading light eyebrow="Included by design" title="No plan can buy a prettier result." copy={<p>Payment changes limits and workflows. It never changes what Aelo counts as evidence.</p>} />
                    <div className="border-t border-[#343c3b]">
                        {[["Failures stay visible", "A provider outage cannot become a zero."], ["Evidence stays attached", "Open the answers and exact provider source URLs behind the summary."], ["Access stays server-side", "Workspace, role and plan checks happen before protected work."], ["Comparisons stay compatible", "Changed measurement conditions produce an inconclusive result."]].map(([title, copy]) => <article key={title} className="grid gap-2 border-b border-[#343c3b] py-5 sm:grid-cols-[.7fr_1.3fr]"><h3 className="font-semibold">{title}</h3><p className="text-sm leading-relaxed text-[#a4aeaa]">{copy}</p></article>)}
                    </div>
                </div>
            </section>

            <section className="px-4 py-24 md:px-6 md:py-32">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.72fr_1.28fr]">
                    <MarketingSectionHeading eyebrow="Before you choose" title="Straight answers about the plans." />
                    <div className="border-t border-[#bbc4bc]">
                        {FAQ.map(([question, answer]) => <details key={question} className="group border-b border-[#bbc4bc] py-5"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold"><span>{question}</span><span className="flex size-8 shrink-0 items-center justify-center text-[#416a88] transition-transform duration-200 group-open:rotate-45">+</span></summary><p className="max-w-3xl pb-2 pt-4 text-base leading-relaxed text-[#53615d]">{answer}</p></details>)}
                    </div>
                </div>
            </section>
        </div>
    );
}
