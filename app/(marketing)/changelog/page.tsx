import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Changelog · Aelo",
    description: "Every material change to Aelo, in reverse-chronological order.",
};

interface Entry {
    date: string;
    version: string;
    kind: "feature" | "fix" | "polish" | "infra";
    title: string;
    bullets: string[];
}

const ENTRIES: Entry[] = [
    {
        date: "2026-07-04",
        version: "0.4.0",
        kind: "feature",
        title: "The receipt is live",
        bullets: [
            "Interventions model shipped — action + baseline + follow-up + verdict, per intervention.",
            "New /dashboard/interventions page with per-row receipts and Measure Impact button.",
            "Forum Hub → intervention loop-closer: marking a thread as posted auto-creates an intervention with a baseline snapshot.",
        ],
    },
    {
        date: "2026-07-04",
        version: "0.3.0",
        kind: "feature",
        title: "Design system + brand archetype",
        bullets: [
            "New Sage + Magician design system: beacon-ivory accent, tabular numerals default, spectrum-rule flourish reserved for receipts.",
            "Refined mark and lowercase wordmark, applied across landing, dashboard, and auth.",
            "PROVE nav group added, signalling the closed-loop philosophy.",
        ],
    },
    {
        date: "2026-07-04",
        version: "0.2.0",
        kind: "fix",
        title: "Honest data policy enforced end-to-end",
        bullets: [
            "Killed the silent mock-data pathway: llm-scanner no longer fabricates a scan when providers fail.",
            "Removed the mock → gemini masquerade at all three write sites.",
            "Dashboard health-score key mismatch fixed — real numbers now flow through.",
        ],
    },
    {
        date: "2026-07-03",
        version: "0.1.0",
        kind: "infra",
        title: "Migrations 015, 016, 017",
        bullets: [
            "015 — interventions table with baseline_snapshot / impact_snapshot / impact_summary.",
            "016 — llm_scans extended with brand_variants, sentiment_score, sentiment_reason, list_items, confidence.",
            "017 — public.users RLS infinite recursion (42P17) killed with a SECURITY DEFINER helper.",
        ],
    },
];

export default function ChangelogPage() {
    return (
        <>
            <section className="pt-20 pb-14 md:pt-28 md:pb-16 px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        Changelog
                    </p>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4">
                        What shipped, and when.
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 leading-relaxed max-w-xl">
                        Every material change to Aelo. Bug fixes, features, infra work. No PR-speak.
                    </p>
                </div>
            </section>

            <section className="pb-24 px-6">
                <div className="mx-auto max-w-3xl space-y-10">
                    {ENTRIES.map(e => (
                        <article key={e.version} className="rounded-lg border border-white/[0.06] bg-black p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[11px] font-mono text-zinc-500 tracking-widest">{e.date}</span>
                                <span className="text-[11px] font-mono text-zinc-600">·</span>
                                <span className="text-[11px] font-mono text-zinc-500">v{e.version}</span>
                                <span className={`ml-auto text-[10px] font-mono uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-sm border ${
                                    e.kind === "feature" ? "border-[var(--accent-base)]/30 text-[var(--accent-base)]" :
                                    e.kind === "fix"     ? "border-red-500/30 text-red-400" :
                                    e.kind === "polish"  ? "border-cyan-500/30 text-cyan-400" :
                                                           "border-zinc-500/30 text-zinc-400"
                                }`}>
                                    {e.kind}
                                </span>
                            </div>
                            <h2 className="text-[18px] font-medium text-white tracking-tight mb-3">
                                {e.title}
                            </h2>
                            <ul className="space-y-1.5">
                                {e.bullets.map((b, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[13.5px] text-zinc-400 leading-relaxed">
                                        <span className="mt-1.5 h-1 w-1 rounded-full bg-zinc-600 flex-shrink-0" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}
