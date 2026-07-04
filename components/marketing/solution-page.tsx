import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

// Shared template so every persona page tells the same shape of story:
// hero → problem → what Aelo does about it → proof strip → CTA.
// Copy stays specific to the persona; layout stays canonical.

export interface SolutionContent {
    persona: string;             // "SaaS Founders", "Marketing Teams", ...
    headline: string;            // The persona's job, in Sage terms
    subheadline: string;         // What Aelo does about it, precisely
    problem: {
        title: string;
        body: string;
    };
    capabilities: { title: string; body: string }[];
    proofPoints: string[];       // 3-5 tight bullets, tabular/factual
    tierRecommendation: {
        tierName: string;
        rationale: string;
    };
    ctaCopy?: string;
}

export function SolutionPage({ content }: { content: SolutionContent }) {
    return (
        <>
            <section className="pt-20 pb-14 md:pt-28 md:pb-20 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        Solutions · {content.persona}
                    </p>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white text-balance mb-5">
                        {content.headline}
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        {content.subheadline}
                    </p>
                </div>
            </section>

            {/* Problem */}
            <section className="pb-20 px-6">
                <div className="mx-auto max-w-3xl border border-white/[0.06] bg-black rounded-lg p-8">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        The Problem
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                        {content.problem.title}
                    </h2>
                    <p className="text-[14.5px] text-zinc-400 leading-relaxed">
                        {content.problem.body}
                    </p>
                </div>
            </section>

            {/* What Aelo does */}
            <section className="py-16 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="mb-10">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            What Aelo does about it
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white max-w-2xl">
                            The loop, tuned for {content.persona.toLowerCase()}.
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {content.capabilities.map(c => (
                            <div key={c.title} className="rounded-md border border-white/[0.06] bg-black p-5">
                                <div className="text-[14px] font-medium text-white mb-1.5">{c.title}</div>
                                <div className="text-[13px] text-zinc-500 leading-relaxed">{c.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Proof strip */}
            <section className="py-16 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4 text-center">
                        Why teams like yours pick Aelo
                    </p>
                    <ul className="space-y-3">
                        {content.proofPoints.map((p, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-md border border-white/[0.06] bg-black p-4">
                                <Check className="w-4 h-4 mt-0.5 text-[var(--accent-base)] flex-shrink-0" />
                                <span className="text-[14px] text-zinc-300 leading-relaxed">{p}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-white/5 text-center px-6">
                <div className="mx-auto max-w-2xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        Recommended tier · {content.tierRecommendation.tierName}
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-4 text-balance">
                        {content.ctaCopy ?? "Start free. Ship the first receipt in a week."}
                    </h2>
                    <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
                        {content.tierRecommendation.rationale}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href="/signup" className="text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2">
                            Start free <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link href="/pricing" className="text-[15px] text-zinc-300 border border-white/15 px-6 py-3 rounded-md hover:bg-white/[0.04] transition-colors font-medium">
                            See pricing
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
