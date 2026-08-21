import Link from "next/link";
import type { Metadata } from "next";
import {
    Search, Bot, BarChart3, Target, Grid3x3, TrendingDown,
    ShieldCheck, FileText, Globe, ArrowRight, CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Features · Aelo",
    description:
        "Everything Aelo measures: multi-engine scans, AI crawler access, prioritised insights, competitor positioning, sentiment drift, accuracy verification, and the India AI Visibility Index.",
    keywords: ["AI visibility features", "AI brand monitoring", "answer engine optimization tools", "AI crawler analytics", "AI sentiment tracking"],
};

type Feature = { icon: typeof Search; name: string; desc: string; badge?: string };

const GROUPS: { stage: string; tagline: string; features: Feature[] }[] = [
    {
        stage: "Measure",
        tagline: "See exactly where you stand",
        features: [
            { icon: Search, name: "Multi-engine scan", desc: "Ask the questions your buyers ask and see how ChatGPT, Gemini, Claude and Perplexity answer, side by side, with the verbatim response behind every number." },
            { icon: Bot, name: "AI Crawlers & Traffic", desc: "Check whether GPTBot, ClaudeBot and PerplexityBot can even reach your site, and how much traffic AI answers are sending back.", badge: "New" },
            { icon: BarChart3, name: "LLM Tracker", desc: "Track your mention rate and average position over time, per engine, so you can see movement instead of a one-time snapshot." },
        ],
    },
    {
        stage: "Diagnose",
        tagline: "Understand why, and what to do",
        features: [
            { icon: Target, name: "Insights", desc: "A prioritised board of what to fix next, generated from your scans: invisible prompts, competitor-owned queries, weak coverage, negative tone.", badge: "New" },
            { icon: Grid3x3, name: "Competitor Positioning", desc: "How AI frames you against every rival, attribute by attribute, on a single grid." },
            { icon: TrendingDown, name: "Sentiment Drift", desc: "Watch the tone of AI answers about you move week over week, and get alerted the moment it shifts." },
        ],
    },
    {
        stage: "Prove",
        tagline: "Show the receipt",
        features: [
            { icon: ShieldCheck, name: "Accuracy Verdict", desc: "Not just whether AI mentions you, but whether what it says is true. Every factual claim checked and marked true, false, or outdated." },
            { icon: FileText, name: "Client Report", desc: "A branded, print-ready AI visibility report with per-engine rates and a shareable receipt, built for agencies." },
            { icon: Globe, name: "India AI Visibility Index", desc: "A public benchmark of how AI describes real Indian brands. Every number from a live scan, zero fabricated." },
        ],
    },
];

export default function FeaturesPage() {
    return (
        <div>
            <section className="pt-20 pb-14 md:pt-28 md:pb-16 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--accent-base)] mb-4">
                        Everything Aelo measures
                    </div>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.05] text-white text-balance mb-5">
                        The instrument for AI answer visibility
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                        Measure how AI describes you, diagnose what is holding you back, and prove
                        the change. Every number opens the raw scan behind it.
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <Link href="/signup" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[var(--accent-base)] text-[var(--text-on-accent)] text-sm font-medium hover:opacity-90 transition-opacity">
                            Start free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/product" className="inline-flex items-center px-5 py-2.5 rounded-lg border border-white/10 text-sm text-zinc-300 hover:text-white transition-colors">
                            How it works
                        </Link>
                    </div>
                </div>
            </section>

            {GROUPS.map((group) => (
                <section key={group.stage} className="pb-16 px-6">
                    <div className="mx-auto max-w-5xl">
                        <div className="flex items-baseline gap-3 mb-6">
                            <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">{group.stage}</h2>
                            <span className="text-[13px] text-zinc-500">{group.tagline}</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {group.features.map((f) => (
                                <div key={f.name} className="rounded-xl border border-white/[0.08] bg-[#0d0d10] p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent-base)]/25 bg-[var(--accent-base)]/10">
                                            <f.icon className="h-5 w-5 text-[var(--accent-base)]" strokeWidth={1.5} />
                                        </div>
                                        {f.badge && (
                                            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--accent-base)] border border-[var(--accent-base)]/25 rounded px-1.5 py-0.5">
                                                {f.badge}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-[16px] font-medium text-white mb-1.5">{f.name}</h3>
                                    <p className="text-[13.5px] text-zinc-400 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            ))}

            <section className="py-20 border-t border-white/5 text-center px-6">
                <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-white mb-4 text-balance">
                    See what AI says about you today
                </h2>
                <p className="text-[15px] text-zinc-400 max-w-xl mx-auto mb-8">
                    The free tier is real. Run your first scan in under a minute, no card required.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <Link href="/signup" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[var(--accent-base)] text-[var(--text-on-accent)] text-sm font-medium hover:opacity-90 transition-opacity">
                        Start free <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/pricing" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-white/10 text-sm text-zinc-300 hover:text-white transition-colors">
                        <CheckCircle2 className="w-4 h-4" /> See plans
                    </Link>
                </div>
            </section>
        </div>
    );
}
