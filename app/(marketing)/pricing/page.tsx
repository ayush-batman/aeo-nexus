import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing · Aelo",
    description: "Priced on outcomes, not scan quotas. From ₹4,999/mo. Razorpay + Stripe. No credit card to start.",
};

interface Tier {
    key: string;
    name: string;
    tagline: string;
    price: string;
    periodNote: string;
    ctaLabel: string;
    ctaHref: string;
    highlight?: boolean;
    features: string[];
    footnote?: string;
}

const TIERS: Tier[] = [
    {
        key: "radar",
        name: "Radar",
        tagline: "Know where you stand.",
        price: "₹4,999",
        periodNote: "/mo · billed monthly",
        ctaLabel: "Start free · 7 days",
        ctaHref: "/signup?plan=radar",
        features: [
            "Weekly scans across ChatGPT, Gemini, Claude, Perplexity",
            "50 target prompts per workspace",
            "Aelo Health Score, Share of Voice, sentiment",
            "Citation attribution (which URLs the AI cites)",
            "Weekly digest email — what changed, what to do",
            "1 workspace",
        ],
        footnote: "For founders and marketers who want a reliable mirror.",
    },
    {
        key: "command",
        name: "Command",
        tagline: "Move the numbers.",
        price: "₹14,999",
        periodNote: "/mo · billed monthly",
        ctaLabel: "Start free · 7 days",
        ctaHref: "/signup?plan=command",
        highlight: true,
        features: [
            "Everything in Radar",
            "Daily scans + real-time alerts",
            "Unlimited target prompts",
            "AI-drafted forum replies + content briefs (Prescribe)",
            "Interventions with before/after receipts (Prove)",
            "3 workspaces · 5 team seats",
            "Priority support",
        ],
        footnote: "For teams that ship — and want proof it worked.",
    },
    {
        key: "concierge",
        name: "Concierge",
        tagline: "We run the loop for you.",
        price: "From ₹50,000",
        periodNote: "/mo · custom",
        ctaLabel: "Book a call",
        ctaHref: "/contact",
        features: [
            "Everything in Command",
            "Dedicated AEO strategist runs the interventions",
            "Custom prompt library built for your ICP",
            "Weekly review call · Slack channel",
            "Unlimited workspaces (agency-friendly)",
            "White-glove reports for your leadership / clients",
            "SLA + security review",
        ],
        footnote: "For agencies and brands wanting done-for-them.",
    },
];

const FAQ: { q: string; a: string }[] = [
    {
        q: "Why aren't you priced on scan quotas like everyone else?",
        a: "Quotas anchor us as a utility, and utilities race to zero. Aelo is priced on the outcome — visibility measured and moved — because that's what matters. Radar scans once a week (enough to notice change), Command scans daily.",
    },
    {
        q: "Do you support Indian brands and ₹ billing?",
        a: "Yes — Aelo is India-first. Native ₹ pricing, Razorpay billing, Indian-query nuance (\"best B2B SaaS in Pune\", \"phones under 20k\"), and a public monthly India AI Visibility Index. Stripe for USD if you're global.",
    },
    {
        q: "Which models do you monitor?",
        a: "ChatGPT (GPT-4o), Gemini 2.5 Flash, Claude 3.5 Sonnet, Perplexity (Llama 3.1 Sonar Online), and Google's AI Overview. More on request.",
    },
    {
        q: "How is Aelo different from Profound, Peec, Otterly?",
        a: "Every other tool is a mirror — they show you visibility. Aelo is a lever — it prescribes actions (forum replies, content, schema) AND proves whether they worked with per-intervention before/after receipts. Nobody else measures outcome per action.",
    },
    {
        q: "What does 'honest data' mean?",
        a: "When a scan provider fails, Aelo shows an honest 'unavailable' state — not a fabricated one. When a follow-up scan regressed, the verdict says regressed. Analytics products die from one made-up number.",
    },
    {
        q: "Can I try before I pay?",
        a: "Yes. Radar and Command have a 7-day free trial. No card required. Your first scan runs in under a minute.",
    },
];

export default function PricingPage() {
    return (
        <>
            {/* Hero */}
            <section className="pt-20 pb-16 md:pt-28 md:pb-20 px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        Pricing
                    </p>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.05] text-white text-balance mb-5">
                        Priced on outcomes, not scan quotas.
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Every tier bills in ₹ (India) or $ (global). No hidden overage. No credit card
                        to start. Cancel any time.
                    </p>
                </div>
            </section>

            {/* Tiers */}
            <section className="pb-20 px-6">
                <div className="mx-auto max-w-6xl">
                    {/* Single-column on <lg to keep prices readable; 3-col from lg+. */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-md lg:max-w-none mx-auto">
                        {TIERS.map(tier => (
                            <TierCard key={tier.key} tier={tier} />
                        ))}
                    </div>
                    <p className="text-center text-[12px] font-mono text-zinc-600 mt-6">
                        Prices shown in ₹ · Global customers billed in $ at market rate · Razorpay + Stripe
                    </p>
                </div>
            </section>

            {/* Comparison strip */}
            <section className="py-20 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="mb-10 text-center">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            What you get across every plan
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
                            No hidden switches. No dark patterns.
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            { t: "Honest data by default",  b: "Provider fails → honest empty state. Never fabricated." },
                            { t: "The closed loop",         b: "Every plan gets Scan → Diagnose. Command adds Prescribe → Act → Prove." },
                            { t: "Cancel anytime",          b: "No annual lock-in. Migrate your data out in one click." },
                        ].map(c => (
                            <div key={c.t} className="rounded-md border border-white/[0.06] bg-black p-5">
                                <div className="text-[13.5px] font-medium text-white mb-1">{c.t}</div>
                                <div className="text-[12.5px] text-zinc-500 leading-relaxed">{c.b}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <div className="mb-8">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            FAQ
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
                            Straight answers.
                        </h2>
                    </div>
                    <div className="divide-y divide-white/5 border-y border-white/5">
                        {FAQ.map((f, i) => (
                            <details key={i} className="group py-4">
                                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                                    <span className="text-[15px] font-medium text-white">{f.q}</span>
                                    <span className="text-zinc-500 group-open:rotate-45 transition-transform">+</span>
                                </summary>
                                <div className="mt-3 text-[14px] text-zinc-400 leading-relaxed">{f.a}</div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 border-t border-white/5 text-center px-6">
                <div className="mx-auto max-w-2xl">
                    <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-4 text-balance">
                        Try the loop. See the receipt.
                    </h2>
                    <p className="text-zinc-400 mb-8">
                        Radar and Command include a 7-day free trial. No card, no commitment.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/signup"
                            className="text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2"
                        >
                            Start free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/contact"
                            className="text-[15px] text-zinc-300 border border-white/15 px-6 py-3 rounded-md hover:bg-white/[0.04] transition-colors font-medium"
                        >
                            Book a call
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

function TierCard({ tier }: { tier: Tier }) {
    return (
        <div
            className={cn(
                "relative rounded-lg border p-6 flex flex-col",
                tier.highlight
                    ? "border-[var(--accent-base)]/60 bg-black shadow-[0_0_40px_rgba(229,211,166,0.06)]"
                    : "border-white/[0.06] bg-black",
            )}
        >
            {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent-base)] px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-on-accent)]">
                    Most chosen
                </div>
            )}
            <div>
                <div className="text-[13px] font-mono uppercase tracking-[0.16em] text-zinc-500">
                    {tier.name}
                </div>
                <div className="mt-1 text-[14px] text-zinc-300">{tier.tagline}</div>
                <div className="mt-6 space-y-1">
                    <div className="text-3xl md:text-4xl font-medium tabular-nums text-white leading-none">
                        {tier.price}
                    </div>
                    <div className="text-[12.5px] text-zinc-500">{tier.periodNote}</div>
                </div>
            </div>
            <div className="mt-6 mb-6 h-px bg-white/5" />
            <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px] text-zinc-300 leading-snug">
                        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[var(--accent-base)]" />
                        <span>{f}</span>
                    </li>
                ))}
            </ul>
            {tier.footnote && (
                <p className="text-[12px] text-zinc-600 italic mb-4">{tier.footnote}</p>
            )}
            <Link
                href={tier.ctaHref}
                className={cn(
                    "text-[14px] rounded-md px-4 py-2.5 font-medium text-center transition-colors inline-flex items-center justify-center gap-2",
                    tier.highlight
                        ? "bg-[var(--accent-base)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)]"
                        : "bg-white/[0.04] text-white border border-white/10 hover:bg-white/[0.08]",
                )}
            >
                {tier.ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
}
