import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Methodology · How Aelo measures AI visibility",
    description: "Every formula, every threshold, every non-determinism disclosure. Read it before you trust any number Aelo shows.",
};

// The methodology page is the Sage bet. Every number in the product is
// grounded in a formula documented here. If we can't explain it in
// under 200 words, we don't ship the metric.

export default function MethodologyPage() {
    return (
        <>
            {/* Hero */}
            <section className="pt-20 pb-10 md:pt-28 md:pb-14 px-6">
                <div className="mx-auto max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] mb-6">
                        <span className="text-[10px] font-mono text-zinc-500 tracking-[0.16em] uppercase">
                            Version 2026.07 · Living document
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.02] text-white text-balance mb-5">
                        How Aelo measures AI visibility
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 leading-relaxed">
                        Every formula. Every threshold. Every disclosure. Read it before you
                        trust any number Aelo shows. When the methodology changes, we bump
                        the version at the top of this page and log the change below, 
                        we never silently retune a metric behind your back.
                    </p>
                </div>
            </section>

            {/* Principles */}
            <section className="py-10 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <SectionLabel>Principles</SectionLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                        <PrincipleCard
                            n="01"
                            title="The receipt is the product"
                            body="Every derived number in Aelo is one click from the raw scans that produced it, prompt sent, LLM response received, timestamp, platform. Verify any claim yourself."
                        />
                        <PrincipleCard
                            n="02"
                            title="Zero is honest"
                            body="Low visibility means low visibility. We don't smooth it, we don't cap it, we don't paint it red just to alarm you. A score of 0 is a real answer, it means the AI didn't name your brand once."
                        />
                        <PrincipleCard
                            n="03"
                            title="No LLM-as-judge, no black boxes"
                            body="We don't ask an LLM to score another LLM's answer. Every metric is a deterministic function of the raw response text (mention-match, position-match, citation-parse). No hidden model, no vibes."
                        />
                        <PrincipleCard
                            n="04"
                            title="Non-determinism, disclosed"
                            body="LLMs drift run-to-run. A single scan is a sample, not a truth. Every dashboard number aggregates multiple scans to reduce noise; every number can still shift ±10 pts between measurements. We say so out loud."
                        />
                    </div>
                </div>
            </section>

            {/* Formulas */}
            <section className="py-16 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-3xl px-6">
                    <SectionLabel>The formulas</SectionLabel>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-3 mb-8 max-w-2xl">
                        Every metric, computed line-by-line.
                    </h2>

                    <div className="space-y-4">
                        <FormulaCard
                            name="Mention rate"
                            oneLine="Percentage of tracked prompts where the AI named your brand."
                            formula="mention_rate = (scans_where_brand_named / total_scans) × 100"
                            details="Deterministic string match against your brand name and known aliases. Case-insensitive, word-boundary respected (so 'Notion' matches but not 'ancnotionally'). Aliases are stored per-workspace and editable."
                        />
                        <FormulaCard
                            name="Average position"
                            oneLine="When your brand IS named, how early in the AI's list?"
                            formula="avg_position = mean(position_index_of_first_mention) across mentioned scans"
                            details="Position 1.0 = named first in the answer. We tokenize the response, find the first index containing the brand name, and average across scans where mention_rate = true. Scans where brand was not mentioned are excluded (not counted as ∞)."
                        />
                        <FormulaCard
                            name="Health score / 100"
                            oneLine="Weighted composite: are you visible, and are you visible early?"
                            formula="health = round( mention_rate × 0.7  +  position_boost × 0.3 )
where position_boost = 100 × max(0, (10 - avg_position) / 10)"
                            details="Mention rate carries most of the weight because being named at all matters more than being named first. Position boost caps out at position 1 (100) and decays linearly to 0 by position 10. Health of 0 means never mentioned; 100 means named first in every scan."
                        />
                        <FormulaCard
                            name="Share of Voice"
                            oneLine="Your mentions as a fraction of all brand mentions in a category."
                            formula="sov = (your_mentions / (your_mentions + Σ competitor_mentions)) × 100"
                            details="Requires competitor names configured in your workspace. We count total occurrences of your name + each competitor's name across all scans in the window, then divide. If competitors aren't set, we show ', ', never a fake number."
                        />
                        <FormulaCard
                            name="Verdict tiers (India Index + metric badges)"
                            oneLine="Strict thresholds, no smoothing."
                            formula="dominant  = mention_rate ≥ 90 AND avg_position ≤ 2
strong    = mention_rate ≥ 60
contested = 1 ≤ mention_rate ≤ 59
invisible = mention_rate = 0"
                            details="Numeric thresholds only. There is no 'trending up' verdict. If the numbers say invisible, the badge says invisible, even if you feel like the trend is positive."
                        />
                    </div>
                </div>
            </section>

            {/* Scan cadence */}
            <section className="py-16 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <SectionLabel>Scan cadence</SectionLabel>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-3 mb-6 max-w-2xl">
                        When and how often we ask the AIs.
                    </h2>
                    <div className="space-y-3">
                        <BulletRow
                            label="Prompt selection"
                            body="Every workspace tracks a curated prompt list, either configured by the customer (Command tier), or authored by our team from intent research (Concierge tier). Prompts are stored and versioned; when they change, the change is logged."
                        />
                        <BulletRow
                            label="Cadence"
                            body="Scheduled scans run once per day per platform per prompt (Command), or every 6 hours (Concierge). Manual scans run on-demand and are indistinguishable in the receipt from scheduled ones."
                        />
                        <BulletRow
                            label="Regionalization"
                            body="Prompts can be sent with a region context ('Respond as if answering from India in English'). The region is stored with the scan; when a metric filters by region, only scans from that region contribute."
                        />
                        <BulletRow
                            label="Rate limits + retries"
                            body="Manual scans are rate-limited to 20/hour/user. Failed scans retry with backoff up to 3× before being marked failed and excluded from metrics. Failure reasons are visible in the receipt."
                        />
                    </div>
                </div>
            </section>

            {/* What we don't do */}
            <section className="py-16 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-3xl px-6">
                    <SectionLabel>What we don&apos;t do</SectionLabel>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-3 mb-6 max-w-2xl">
                        The tempting shortcuts we refuse.
                    </h2>
                    <div className="space-y-2">
                        <RefusalRow item="We don't use LLMs to score LLMs." reason="LLM-as-judge introduces a black box you can't audit and a bias you can't measure. Everything downstream inherits both." />
                        <RefusalRow item="We don't average across platforms unless you ask." reason="Averaging ChatGPT + Gemini + Claude produces a single feel-good number that hides real strategic differences. Per-platform first, aggregate on request." />
                        <RefusalRow item="We don't include failed scans in the denominator." reason="A network error isn't 'invisible.' A rate limit isn't 'no mention.' Failed scans are logged, tagged, and excluded, with the failure visible in the receipt." />
                        <RefusalRow item="We don't hide our sample size." reason="If a metric is computed from 3 scans, we say so. If it's computed from 300, we say so. Sample size travels with every number in the drawer." />
                        <RefusalRow item="We don't retune metrics silently." reason="If a formula changes, the version at the top of this page bumps and a changelog entry appears below. Historical numbers get re-flagged as 'v1' vs 'v2' so year-over-year comparisons stay honest." />
                    </div>
                </div>
            </section>

            {/* Data + retention */}
            <section className="py-16 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <SectionLabel>Data + retention</SectionLabel>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mt-3 mb-6 max-w-2xl">
                        Where the receipts live, and for how long.
                    </h2>
                    <div className="space-y-3">
                        <BulletRow label="Storage" body="Raw scan rows (prompt, response, timestamp, platform, position, sentiment, citations) live in Postgres with per-workspace RLS. Only members of your workspace can read them. Aelo staff access requires an audit-logged support ticket." />
                        <BulletRow label="Retention" body="90 days on Command, 24 months on Concierge, unlimited on Command Enterprise. Deleted workspaces have all scans purged within 30 days." />
                        <BulletRow label="Export" body="Any workspace can export every scan as CSV or JSON. Nothing about a metric is proprietary to Aelo, take the receipts with you if you leave." />
                        <BulletRow label="Third-party access" body="We do not sell, share, or aggregate customer scan data. Ever." />
                    </div>
                </div>
            </section>

            {/* Changelog */}
            <section className="py-14 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-3xl px-6">
                    <SectionLabel>Methodology changelog</SectionLabel>
                    <div className="mt-6 space-y-2">
                        <ChangeRow date="2026-07-05" note="Initial published version (v2026.07). Introduces Sage verdict tiers, honest-data policy, and non-determinism disclosure." />
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 border-t border-white/5">
                <div className="mx-auto max-w-3xl px-6">
                    <div className="rounded-lg border border-[var(--accent-base)]/40 bg-black p-8 md:p-10 text-center">
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                            Trust the receipts, not the vibes.
                        </h2>
                        <p className="text-[15px] text-zinc-400 leading-relaxed mb-6 max-w-2xl mx-auto">
                            See a live example: the India AI Visibility Index publishes every
                            number with the same rules documented above. Every brand&apos;s
                            score links back to the scans that produced it.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/india-index"
                                className="text-[14px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-5 py-2.5 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2"
                            >
                                See the India Index <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                                href="/manifesto"
                                className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                            >
                                Read the honest-data manifesto →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">{children}</p>
    );
}

function PrincipleCard({ n, title, body }: { n: string; title: string; body: string }) {
    return (
        <div className="rounded-md border border-white/[0.06] bg-black p-5">
            <div className="text-[10px] font-mono text-[var(--accent-base)] tracking-[0.14em] mb-2">
                {n}
            </div>
            <div className="text-[15px] font-medium text-white mb-1.5">{title}</div>
            <div className="text-[13px] text-zinc-500 leading-relaxed">{body}</div>
        </div>
    );
}

function FormulaCard({ name, oneLine, formula, details }: { name: string; oneLine: string; formula: string; details: string }) {
    return (
        <div className="rounded-md border border-white/[0.06] bg-black overflow-hidden">
            <div className="px-5 pt-5">
                <div className="text-[15px] font-medium text-white mb-1">{name}</div>
                <div className="text-[13px] text-zinc-400 leading-relaxed mb-3">{oneLine}</div>
            </div>
            <pre className="mx-5 mb-4 p-3 rounded-md border border-white/5 bg-[#040405] text-[12px] font-mono text-[var(--accent-base)] leading-relaxed whitespace-pre-wrap">
                {formula}
            </pre>
            <div className="px-5 pb-5 text-[12px] text-zinc-500 leading-relaxed">{details}</div>
        </div>
    );
}

function BulletRow({ label, body }: { label: string; body: string }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 md:gap-6 py-3 border-b border-white/[0.05] last:border-b-0">
            <div className="text-[12px] font-mono uppercase tracking-[0.12em] text-zinc-500">{label}</div>
            <div className="text-[13px] text-zinc-300 leading-relaxed">{body}</div>
        </div>
    );
}

function RefusalRow({ item, reason }: { item: string; reason: string }) {
    return (
        <div className="rounded-md border border-white/[0.05] bg-black p-4">
            <div className="text-[14px] font-medium text-white mb-1">{item}</div>
            <div className="text-[12px] text-zinc-500 leading-relaxed">{reason}</div>
        </div>
    );
}

function ChangeRow({ date, note }: { date: string; note: string }) {
    return (
        <div className="flex items-start gap-4 py-2 border-b border-white/[0.05] last:border-b-0">
            <div className="text-[11px] font-mono text-zinc-500 min-w-[90px] flex-shrink-0 tabular-nums">
                {date}
            </div>
            <div className="text-[13px] text-zinc-300 leading-relaxed">{note}</div>
        </div>
    );
}
