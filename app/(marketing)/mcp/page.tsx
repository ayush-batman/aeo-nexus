import Link from "next/link";
import type { Metadata } from "next";
import { McpInstall } from "@/components/marketing/mcp-install";
import {
    ArrowRight, Eye, Activity, Search, GitCompare, Target, Link2,
    ShieldCheck, Bot, ListChecks, CalendarClock, XCircle, CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
    title: "MCP · Aelo",
    description:
        "Connect Claude, Cursor or Codex to Aelo and ask how visible your brand is across ChatGPT, Gemini, Claude and Perplexity, with multi-sampled numbers and the receipts. Read-first and honest: no bought upvotes, no ordered citations.",
    keywords: ["AI visibility MCP", "Model Context Protocol", "AEO MCP", "Claude MCP AI visibility", "honest AI visibility"],
};

const READS = [
    { icon: Eye, name: "get_visibility_overview", desc: "Your visibility per engine, right now, with confidence and sample count." },
    { icon: Activity, name: "get_answer_volatility", desc: "How much the answer changes when you ask again. Our signature metric." },
    { icon: Search, name: "run_visibility_scan", desc: "A fresh multi-sample scan for one buyer question, with the raw passes as evidence." },
    { icon: GitCompare, name: "compare_competitors", desc: "Share of voice: who AI names in your category, and where you rank." },
    { icon: Target, name: "analyze_prompt_gaps", desc: "The buyer questions you should own and don't, ranked by opportunity." },
    { icon: Link2, name: "list_citations", desc: "The real source URLs engines pulled from. Receipts, not vibes." },
    { icon: ShieldCheck, name: "get_accuracy_verdict", desc: "Every claim AI made about you, checked true / false / outdated with its source." },
    { icon: Bot, name: "get_crawler_access", desc: "Can AI crawlers reach you, plus AI referral traffic by engine." },
];

const WRITES = [
    { icon: ListChecks, name: "track_prompt", desc: "Start measuring a buyer question. Measurement only." },
    { icon: CalendarClock, name: "schedule_scan", desc: "Schedule a recurring multi-sample scan. Spends nothing on your behalf." },
];

export default function McpPage() {
    return (
        <div className="bg-black text-white">
            {/* Hero */}
            <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
                <span className="inline-block text-[11px] font-mono uppercase tracking-[0.22em] text-[var(--accent-base)] mb-5">
                    Model Context Protocol
                </span>
                <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-balance max-w-3xl mx-auto">
                    Ask your assistant how visible you are. Get the honest number.
                </h1>
                <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    Connect Claude, Cursor or Codex to Aelo. Your assistant reads how ChatGPT, Gemini, Claude and
                    Perplexity actually answer about your brand, multi-sampled and backed by receipts, and can queue
                    the measurement, all in one chat.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                    <Link
                        href="/signup"
                        className="text-sm bg-[var(--accent-base)] text-[var(--text-on-accent)] px-5 py-2.5 rounded-md font-medium hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center gap-2"
                    >
                        Get an API key <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href="#install" className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2.5">
                        See install steps
                    </a>
                </div>
            </section>

            {/* Honesty contrast */}
            <section className="border-y border-white/5 bg-[#070707]">
                <div className="mx-auto max-w-4xl px-6 py-14">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-white/10 p-6">
                            <div className="flex items-center gap-2 text-zinc-500 text-[12px] font-mono uppercase tracking-wider mb-4">
                                <XCircle className="h-4 w-4" /> Other AI-visibility MCPs
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>Can buy you upvotes on your behalf.</li>
                                <li>Can order citations and queue posts through community accounts.</li>
                                <li>Report a single-shot number with no confidence.</li>
                                <li>Convenient, until a platform flags the manufactured engagement.</li>
                            </ul>
                        </div>
                        <div className="rounded-xl border border-[var(--accent-base)]/30 bg-[var(--accent-base)]/[0.04] p-6">
                            <div className="flex items-center gap-2 text-[var(--accent-base)] text-[12px] font-mono uppercase tracking-wider mb-4">
                                <CheckCircle2 className="h-4 w-4" /> The Aelo MCP
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-300">
                                <li>Every number is multi-sampled, with confidence and sample count.</li>
                                <li>Citations come back as the actual source URLs.</li>
                                <li>Tells you where to <span className="text-white">earn</span> a mention. Never sells you one.</li>
                                <li>Writes are measurement only. No money, no manipulation, ever.</li>
                            </ul>
                        </div>
                    </div>
                    <p className="mt-8 text-center text-lg text-zinc-300 max-w-2xl mx-auto text-balance">
                        Their assistant can buy you fake signal. Ours tells you the truth and where to earn the real thing.
                    </p>
                </div>
            </section>

            {/* What your assistant can do */}
            <section className="mx-auto max-w-6xl px-6 py-16">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">What your assistant can do</h2>
                <p className="mt-3 text-zinc-400 max-w-2xl">Reads pull your visibility data. The only writes are measurement.</p>

                <div className="mt-8">
                    <h3 className="text-[12px] font-mono uppercase tracking-[0.16em] text-zinc-500 mb-4">Read</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {READS.map((t) => (
                            <div key={t.name} className="rounded-lg border border-white/10 p-4 hover:border-white/20 transition-colors">
                                <t.icon className="h-5 w-5 text-[var(--accent-base)] mb-3" />
                                <code className="text-[13px] text-white font-mono">{t.name}</code>
                                <p className="mt-2 text-[13px] text-zinc-400 leading-relaxed">{t.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-10">
                    <h3 className="text-[12px] font-mono uppercase tracking-[0.16em] text-zinc-500 mb-4">Write · measurement only</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {WRITES.map((t) => (
                            <div key={t.name} className="rounded-lg border border-white/10 p-4">
                                <t.icon className="h-5 w-5 text-[var(--data-green)] mb-3" />
                                <code className="text-[13px] text-white font-mono">{t.name}</code>
                                <p className="mt-2 text-[13px] text-zinc-400 leading-relaxed">{t.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-[13px] text-zinc-500">
                        There is no <code className="font-mono text-zinc-400">send_upvotes</code>, no "order citations", no
                        posting on your behalf. By design.
                    </p>
                </div>
            </section>

            {/* Install */}
            <section id="install" className="border-t border-white/5 bg-[#070707]">
                <div className="mx-auto max-w-3xl px-6 py-16">
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Connect it in a minute</h2>
                    <McpInstall />
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-6xl px-6 py-20 text-center">
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
                    The honest measurement layer, now inside your assistant.
                </h2>
                <div className="mt-8">
                    <Link
                        href="/signup"
                        className="text-sm bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md font-medium hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center gap-2"
                    >
                        Start free and get your key <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
