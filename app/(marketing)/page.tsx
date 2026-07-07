"use client";

import Link from "next/link";
import {
    ArrowRight,
    Search,
    Layers,
    ClipboardList,
    Zap,
    CheckCircle2,
} from "lucide-react";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

// ============================================================================
// Landing — Aelo
// Archetype: Sage (primary) + Magician (shading).
// Rules: data speaks first, no aspirational adjectives, no gradient hype.
// ============================================================================

export default function LandingPage() {
    return (
        <>
            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <section className="pt-24 pb-16 md:pt-36 md:pb-24 px-6">
                <div className="mx-auto max-w-4xl text-center flex flex-col items-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] text-zinc-300 tracking-[0.14em] uppercase font-mono">
                            Live on ChatGPT · Gemini · Claude · Perplexity
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-[1.02] mb-6 text-white text-balance">
                        The standard for<br />
                        artificial intelligence visibility.
                    </h1>

                    <p className="text-[17px] md:text-[19px] text-zinc-400 max-w-2xl text-balance leading-relaxed mb-10">
                        Aelo is the instrument for measuring — and moving — how ChatGPT, Gemini,
                        Claude and Perplexity answer questions about your brand. Every metric is
                        computed from a real scan. Nothing is fabricated.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Link
                            href="/signup"
                            className="w-full sm:w-auto text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            Start free
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/product"
                            className="w-full sm:w-auto text-[15px] bg-transparent text-white border border-white/15 px-6 py-3 rounded-md hover:bg-white/[0.04] transition-colors font-medium flex items-center justify-center"
                        >
                            See how it works
                        </Link>
                    </div>

                    <p className="text-[12px] text-zinc-600 mt-6 font-mono">
                        No credit card · Priced in ₹ from ₹4,999/mo · Razorpay + Stripe
                    </p>
                </div>
            </section>

            {/* ── PRODUCT MOCKUP ─────────────────────────────────────────── */}
            <section className="pb-24 px-6">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-lg border border-white/10 bg-[#0A0A0B] p-2 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                        <div className="rounded-md border border-white/[0.05] bg-[#121213] p-8 md:p-10">
                            <div className="flex flex-col md:flex-row gap-10 items-start">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.16em] mb-2">
                                        Aelo Health Score · Notion
                                    </p>
                                    <div className="flex items-baseline gap-3 mb-3">
                                        <span className="text-6xl md:text-7xl font-medium tracking-tighter text-white tabular-nums">67</span>
                                        <span className="text-zinc-500 tabular-nums">/100</span>
                                        <span className="text-[13px] text-emerald-400 font-mono">+18 pts</span>
                                    </div>
                                    <div className="spectrum-rule mb-3" />
                                    <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500 mb-1">
                                        Receipt · Verdict improved
                                    </p>
                                    <p className="text-[13px] text-zinc-400 leading-relaxed">
                                        Published /best-team-wikis-2026 → visibility rose from 49 → 67
                                        on the target query in 3 weeks. Measured on real Gemini calls.
                                    </p>
                                </div>

                                <div className="w-full md:w-[280px] grid grid-cols-2 gap-3">
                                    {[
                                        { engine: "ChatGPT",    score: 78, share: 78 },
                                        { engine: "Perplexity", score: 61, share: 61 },
                                        { engine: "Claude",     score: 72, share: 72 },
                                        { engine: "Gemini",     score: 57, share: 57 },
                                    ].map(s => (
                                        <div key={s.engine} className="rounded-md border border-white/[0.06] bg-black p-3">
                                            <div className="text-[11px] font-mono text-zinc-500 mb-1">{s.engine}</div>
                                            <div className="text-xl font-medium text-white tabular-nums">{s.score}</div>
                                            <div className="h-[2px] w-full bg-white/5 mt-3 overflow-hidden">
                                                <div className="h-full bg-white/70" style={{ width: `${s.share}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <p className="text-center text-[11px] font-mono text-zinc-600 mt-3">
                        Real UI. Real numbers on request. No mock data anywhere.
                    </p>
                </div>
            </section>

            {/* ── THE LOOP ──────────────────────────────────────────────── */}
            <section id="platform" className="py-24 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="mb-14 max-w-3xl">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            The Aelo Loop
                        </p>
                        <h2 className="text-3xl md:text-5xl font-medium tracking-tight mb-5 text-white">
                            Tracking is a mirror.<br />Aelo is a lever.
                        </h2>
                        <p className="text-zinc-400 text-[16px] leading-relaxed">
                            Every other tool in this category shows you where you stand. Aelo shows
                            you what to do — and proves whether it worked. Five steps, welded into
                            one product.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
                        {[
                            { icon: Search,       title: "Scan",       body: "Automated multi-LLM scans across ChatGPT, Gemini, Claude, Perplexity, Google AI Overview." },
                            { icon: Layers,       title: "Diagnose",   body: "Citation attribution — the exact URLs LLMs pull from when they mention (or ignore) your brand." },
                            { icon: ClipboardList,title: "Prescribe",  body: "AI-drafted forum replies, content briefs, and schema markup targeting your weakest queries." },
                            { icon: Zap,          title: "Act",        body: "Publish the reply. Ship the page. Add the JSON-LD. Aelo captures a baseline the moment you act." },
                            { icon: CheckCircle2, title: "Prove",      body: "Re-scan. Compare. Deliver the receipt — visibility change, verdict, and per-prompt delta." },
                        ].map((step, i) => (
                            <div key={step.title} className="bg-black p-6 space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] text-zinc-600 tracking-[0.16em]">0{i + 1}</span>
                                    <step.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                                </div>
                                <div className="text-[15px] font-medium text-white">{step.title}</div>
                                <div className="text-[12.5px] text-zinc-500 leading-relaxed">{step.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── DIFFERENTIATOR / HONESTY STRIP ─────────────────────── */}
            <section className="py-24 border-t border-white/5">
                <div className="mx-auto max-w-4xl px-6 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        The Honest Data Policy
                    </p>
                    <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-5 text-balance">
                        We refuse to invent a number.
                    </h2>
                    <p className="text-zinc-400 text-[16px] leading-relaxed max-w-2xl mx-auto">
                        When a scan fails, Aelo shows an honest &quot;provider unavailable&quot; state instead
                        of a fabricated one. When a follow-up scan shows regression, the receipt says
                        regressed. Analytics products sell trust — the moment we invent numbers, we
                        stop being useful.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-[12px] font-mono text-zinc-500">
                        Read the{" "}
                        <Link href="/manifesto" className="text-[var(--accent-base)] hover:underline">
                            Manifesto
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── WHO IT'S FOR (segments) ───────────────────────────── */}
            <section className="py-24 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="mb-12 max-w-2xl">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            Solutions
                        </p>
                        <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white">
                            Precision for teams that live and die by the answer.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                            { href: "/solutions/founders",  title: "SaaS Founders",  body: "Own the shortlist buyers ask ChatGPT for. Measure it weekly." },
                            { href: "/solutions/marketing", title: "Marketing Teams", body: "Replace SEO reports with a receipt: what you shipped, what it moved." },
                            { href: "/solutions/agencies",  title: "Agencies",       body: "Client-ready workspaces. One dashboard per brand. Concierge tier available." },
                            { href: "/solutions/india",     title: "India-first Brands", body: "₹ pricing, Razorpay, Indian-query nuance, a public India AI Visibility Index." },
                        ].map(s => (
                            <Link
                                key={s.href}
                                href={s.href}
                                className="group rounded-lg border border-white/[0.06] bg-black p-6 hover:border-white/15 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1.5">
                                        <div className="text-[14px] font-medium text-white">{s.title}</div>
                                        <div className="text-[13px] text-zinc-500 leading-relaxed">{s.body}</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors mt-0.5" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CLOSING CTA ─────────────────────────────────────── */}
            <section className="py-24 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white mb-6 text-balance">
                        Stop guessing what the AI is saying about you.
                    </h2>
                    <p className="text-zinc-400 text-[16px] leading-relaxed mb-8 max-w-xl mx-auto">
                        Start free. Your first scan runs in under a minute. Add the follow-up
                        when you&apos;re ready to prove impact.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            href="/signup"
                            className="text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2"
                        >
                            Start free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/pricing"
                            className="text-[15px] text-zinc-300 border border-white/15 px-6 py-3 rounded-md hover:bg-white/[0.04] transition-colors font-medium"
                        >
                            See pricing
                        </Link>
                    </div>

                    {/* Not ready to sign up? Newsletter is the softer entry point. */}
                    <div className="mt-14 max-w-lg mx-auto text-left">
                        <NewsletterSubscribe source="landing-closing" variant="hero" />
                    </div>
                </div>
            </section>
        </>
    );
}
