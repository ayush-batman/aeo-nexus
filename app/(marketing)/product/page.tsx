import Link from "next/link";
import { ArrowRight, Search, Layers, ClipboardList, Zap, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { SoftwareApplicationJsonLd, BreadcrumbJsonLd } from "@/components/seo/structured-data";

export const metadata: Metadata = {
    title: "Product · Aelo",
    description: "The Aelo loop: Scan → Diagnose → Prescribe → Act → Prove. Every step, welded into one product.",
};

interface Step {
    n: string;
    key: string;
    icon: typeof Search;
    title: string;
    lede: string;
    body: string;
    bullets: string[];
    footer?: string;
}

const STEPS: Step[] = [
    {
        n: "01",
        key: "scan",
        icon: Search,
        title: "Scan",
        lede: "Every AI, every prompt that matters, on a schedule.",
        body: "The scanner runs your target prompts across ChatGPT (GPT-4o), Gemini 2.5, Claude 3.5 Sonnet, Perplexity's Llama 3.1 Sonar, and Google's AI Overview. Every run is analyzed by an in-loop model that extracts the structured signals, mentioned, position, sentiment, competitors, citations. Nothing is fabricated. When a provider fails, we surface an honest empty state.",
        bullets: [
            "Multi-LLM parallel scans (5 providers today; more on request)",
            "Analyzer-in-loop: sentiment score, reasons, brand aliases",
            "Weekly (Radar) or daily (Command) cadence, Vercel Cron",
            "Schedules survive limit hits; overage is prevented, not billed",
        ],
    },
    {
        n: "02",
        key: "diagnose",
        icon: Layers,
        title: "Diagnose",
        lede: "The exact URLs the AI leans on when it answers.",
        body: "For every mention (and every miss), Aelo attributes the citation graph, the specific Reddit threads, Wikipedia articles, G2 pages, and technical documentation the LLM pulled from. We compare your citation footprint to competitors and highlight Citation Gaps, the pages that produce answers but never mention you.",
        bullets: [
            "Per-scan citation extraction with own-domain flagging",
            "Citation Gap analysis vs. every tracked competitor",
            "Source classification (Reddit, docs, Tier-1 media, own domain)",
            "Own-domain-cited alerts when an LLM starts using your site",
        ],
    },
    {
        n: "03",
        key: "prescribe",
        icon: ClipboardList,
        title: "Prescribe",
        lede: "Actions ranked by expected visibility movement.",
        body: "Aelo turns diagnosis into an ordered work queue: draft this forum reply, publish this comparison page, add this schema block, close this citation gap. Every item is scoped, actionable, and tied to the specific prompt it will affect. Content briefs and Reddit-safe replies are pre-drafted by an in-loop model.",
        bullets: [
            "Forum reply drafts (non-spammy, community-aware)",
            "Content briefs targeting the exact intent queries",
            "Schema.org JSON-LD snippets for machine readability",
            "Prioritized by baseline gap × prompt intent volume",
        ],
    },
    {
        n: "04",
        key: "act",
        icon: Zap,
        title: "Act",
        lede: "You ship. Aelo snapshots the baseline the moment you do.",
        body: "Mark a forum reply as posted, or hit publish from Content Studio, Aelo captures the frozen visibility snapshot at that moment. That baseline is denormalized into the intervention record, so even if raw scans are pruned later, the 'before' number survives. This is what makes the receipt trustworthy.",
        bullets: [
            "One-click 'mark as posted' from Forum Hub",
            "Content Studio publish → auto-intervention",
            "Baseline snapshot per (prompt × platform), frozen in JSONB",
            "Every action is a row you can audit later",
        ],
    },
    {
        n: "05",
        key: "prove",
        icon: CheckCircle2,
        title: "Prove",
        lede: "Re-scan. Compare. Deliver the receipt.",
        body: "Hit Measure and Aelo re-scans every target prompt on every configured provider, computes the delta vs. baseline, and writes the receipt, visibility change in points, position change, a Verdict (improved / no_change / regressed), and the timestamp. Nothing is smoothed. If the follow-up regressed, it says regressed.",
        bullets: [
            "Per-intervention before/after receipts (Verdict + delta)",
            "Weekly digest email rolls receipts into one summary",
            "Public monthly India AI Visibility Index built from anonymized deltas",
            "Every number is a query away from the raw scan",
        ],
        footer: "The receipt is the class-apart part. Nobody else in this category proves outcome per intervention.",
    },
];

export default function ProductPage() {
    return (
        <>
            <SoftwareApplicationJsonLd />
            <BreadcrumbJsonLd items={[{ label: 'Product', path: '/product' }]} />
            {/* Hero */}
            <section className="pt-20 pb-14 md:pt-28 md:pb-20 px-6">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        The Aelo Loop · Five welded steps
                    </p>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.05] text-white text-balance mb-5">
                        Scan → Diagnose → Prescribe → Act → Prove.
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Every other AEO tool stops at Scan. Aelo carries the loop all the way to the
                        receipt, the number that says whether what you shipped moved the answer.
                    </p>
                </div>
            </section>

            {/* Steps */}
            <section className="pb-24 px-6">
                <div className="mx-auto max-w-4xl space-y-14">
                    {STEPS.map((s, i) => (
                        <div key={s.key} className="relative">
                            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr] gap-6 md:gap-10">
                                <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-4">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-md border border-white/10 bg-white/[0.03] text-white">
                                        <s.icon className="w-4.5 h-4.5" strokeWidth={1.5} />
                                    </div>
                                    <div className="font-mono text-[11px] text-zinc-600 tracking-[0.16em]">
                                        {s.n}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-2">
                                        {s.title}
                                    </h2>
                                    <p className="text-[15.5px] text-zinc-300 mb-4">{s.lede}</p>
                                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-5">
                                        {s.body}
                                    </p>
                                    <ul className="space-y-2">
                                        {s.bullets.map(b => (
                                            <li key={b} className="flex items-start gap-2 text-[13.5px] text-zinc-400 leading-snug">
                                                <span className="mt-1 h-1 w-1 rounded-full bg-zinc-600 flex-shrink-0" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {s.footer && (
                                        <div className="mt-5 border-l-2 border-[var(--accent-base)] pl-4 py-1 text-[13px] text-zinc-300 italic">
                                            {s.footer}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className="ml-5 md:ml-5 mt-6 h-6 border-l border-dashed border-white/10" />
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Technical strip */}
            <section className="py-20 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-6xl px-6">
                    <div className="mb-10">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            Under the hood
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white max-w-2xl">
                            Serverless, multi-tenant, real-time. Trust every row.
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { t: "Next.js 16 · Vercel", b: "Edge-fast dashboard, Serverless API routes, Cron for schedules." },
                            { t: "Supabase Postgres", b: "Row-Level Security scoped by Organization → Workspace. RLS you can audit." },
                            { t: "Multi-tenant Workspaces", b: "One org, many brands. Agency-ready. Client-safe by default." },
                            { t: "Honest data policy", b: "No mock rows in the database. Ever. See the manifesto." },
                        ].map(c => (
                            <div key={c.t} className="rounded-md border border-white/[0.06] bg-black p-5">
                                <div className="text-[13.5px] font-medium text-white mb-1">{c.t}</div>
                                <div className="text-[12.5px] text-zinc-500 leading-relaxed">{c.b}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-white/5 text-center px-6">
                <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-4 text-balance">
                    See the loop, running.
                </h2>
                <p className="text-zinc-400 mb-8">
                    Your first scan finishes in under a minute. Interventions unlock on Command.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/signup" className="text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2">
                        Start free <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/pricing" className="text-[15px] text-zinc-300 border border-white/15 px-6 py-3 rounded-md hover:bg-white/[0.04] transition-colors font-medium">
                        See pricing
                    </Link>
                </div>
            </section>
        </>
    );
}
