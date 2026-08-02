import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About · Aelo",
    description: "Aelo is the instrument for measuring, and moving, how AI answers about your brand.",
};

const VALUES = [
    {
        t: "Honest data or nothing",
        b: "The moment we invent a number, we stop being useful. Every metric in Aelo is auditable to the raw scan. When a scan fails, we show it. See the manifesto.",
    },
    {
        t: "The receipt is the product",
        b: "Anyone can build a mirror. We're building the lever, action + baseline + follow-up + verdict. This is what makes AEO defensible as a discipline.",
    },
    {
        t: "India-first as a wedge",
        b: "The global tools are built for US queries in US dollars. India is the #1 country for ChatGPT users. We build in ₹ and understand Indian intent, then expand outward.",
    },
    {
        t: "Ship what you can defend",
        b: "Every feature has to survive the audit: is this true, is this useful, is it the loop? If not, it doesn't ship. We'd rather ship one feature well than ten badly.",
    },
];

export default function AboutPage() {
    return (
        <>
            <section className="pt-24 pb-14 md:pt-32 md:pb-20 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        About
                    </p>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.02] text-white text-balance mb-6">
                        We&apos;re building the instrument for a category that didn&apos;t exist two years ago.
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 leading-relaxed max-w-2xl mx-auto">
                        AI answers are becoming the shortlist. Aelo is the tool your team uses to
                        measure, and move, where you land on it.
                    </p>
                </div>
            </section>

            {/* Mission */}
            <section className="pb-20 px-6">
                <div className="mx-auto max-w-3xl border border-white/[0.06] bg-black rounded-lg p-8 md:p-10">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        Mission
                    </p>
                    <p className="text-[18px] md:text-[20px] text-white leading-[1.5] font-medium tracking-tight">
                        Make AI-answer visibility a measurable, movable, provable discipline, the
                        way SEO once was, but faster and more honest.
                    </p>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 border-t border-white/5 bg-[#050506]">
                <div className="mx-auto max-w-4xl px-6">
                    <div className="mb-10">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            Values
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
                            Four rules the product is built to obey.
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {VALUES.map(v => (
                            <div key={v.t} className="rounded-md border border-white/[0.06] bg-black p-6">
                                <div className="text-[15px] font-medium text-white mb-2">{v.t}</div>
                                <div className="text-[13.5px] text-zinc-400 leading-relaxed">{v.b}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Origin */}
            <section className="py-20 border-t border-white/5">
                <div className="mx-auto max-w-2xl px-6">
                    <div className="mb-6">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                            Origin
                        </p>
                        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
                            Why we started this.
                        </h2>
                    </div>
                    <div className="text-[15px] text-zinc-400 leading-[1.75] space-y-4">
                        <p>
                            Aelo started because every existing AEO tool showed us a mirror and
                            called it a strategy. &ldquo;Here&apos;s your visibility score.&rdquo; Now what?
                            No one had a clear answer.
                        </p>
                        <p>
                            The insight was simple: the value of the mirror ends where the value of
                            the receipt begins. If we could log every action a team takes, capture a
                            baseline, and re-measure after, we&apos;d have the first tool that could
                            actually prove AEO works, per intervention, in defensible numbers.
                        </p>
                        <p>
                            We&apos;re building the tool we wished existed when we were the marketer,
                            the founder, and the agency operator trying to justify AEO spend to the
                            room.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-white/5 text-center px-6">
                <p className="text-zinc-400 mb-6">Want to talk? We&apos;re easy to reach.</p>
                <Link
                    href="/contact"
                    className="text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2"
                >
                    Contact us →
                </Link>
            </section>
        </>
    );
}
