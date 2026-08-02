import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manifesto · Aelo",
    description: "Our honest-data policy, why Aelo refuses to invent a number.",
};

export default function ManifestoPage() {
    return (
        <>
            {/* Hero */}
            <section className="pt-24 pb-8 md:pt-32 md:pb-12 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        Manifesto
                    </p>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.02] text-white text-balance">
                        We refuse to invent a number.
                    </h1>
                </div>
            </section>

            {/* Long-form */}
            <section className="pb-24 px-6">
                <article className="mx-auto max-w-2xl text-[16px] leading-[1.75] text-zinc-300 space-y-8">
                    <p className="text-[17px] text-white">
                        Analytics products sell one thing: trust. The moment we invent a number, we stop
                        being useful, we become another mirror for wishful thinking.
                    </p>

                    <div className="border-l-2 border-[var(--accent-base)] pl-5">
                        <p className="text-zinc-400 text-[15px] italic">
                            &ldquo;Every metric on this page is computed from real scans. Nothing is
                            fabricated, so the numbers stay at zero until we have something to
                            measure.&rdquo;
                        </p>
                        <p className="mt-2 text-[12px] font-mono text-zinc-600">
, the empty state on every Aelo dashboard
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-medium text-white tracking-tight mb-3">
                            What honest data means, concretely
                        </h2>
                        <ul className="space-y-3 text-zinc-400">
                            <li>
                                <span className="text-white">When a provider fails,</span> we surface an
                                honest &ldquo;provider unavailable&rdquo; state, not a fabricated one.
                                No mock row ever writes to the database labeled as real.
                            </li>
                            <li>
                                <span className="text-white">When a follow-up scan regressed,</span> the
                                receipt says regressed. Aelo does not smooth or hide.
                            </li>
                            <li>
                                <span className="text-white">When we do not know,</span> the number is
                                zero, not a guess. Zero is honest. A guess is a lie in a lab coat.
                            </li>
                            <li>
                                <span className="text-white">Every number is one query away from the
                                raw scan</span> that produced it. You can audit any metric down to
                                the exact API response.
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-medium text-white tracking-tight mb-3">
                            Why we&apos;re strict about it
                        </h2>
                        <p>
                            Marketing tools face pressure, from us and from customers, to make
                            dashboards look good. A dashboard that says &ldquo;you&apos;re winning&rdquo; is
                            easier to sell than one that says &ldquo;you&apos;re missing the top intent
                            query in your category.&rdquo;
                        </p>
                        <p className="mt-3">
                            But the moment a customer discovers we softened a number, we&apos;ve broken
                            the product. Aelo bets everything on being the tool you can actually
                            act on, and that only works if the numbers are true, all the way down.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xl font-medium text-white tracking-tight mb-3">
                            The receipt is the point
                        </h2>
                        <p>
                            Every other tool in this category tells you where you stand. Aelo goes one
                            step further: it tells you what happened after you acted. The intervention
                            model, action + baseline + follow-up scan + verdict, is what makes AEO
                            work at all as a discipline. Without it, we&apos;re guessing.
                        </p>
                        <p className="mt-3">
                            We&apos;d rather ship one receipt that says &ldquo;regressed&rdquo; than a
                            hundred green numbers that mean nothing.
                        </p>
                    </div>

                    <div className="border-t border-white/5 pt-8">
                        <p className="text-[15px] text-white font-medium">
                            If Aelo ever ships a metric it can&apos;t defend, tell us. We will remove it.
                        </p>
                        <p className="mt-2 text-[13px] text-zinc-500 font-mono">
                            trust@aelohq.com
                        </p>
                    </div>
                </article>

                <div className="text-center mt-16">
                    <Link
                        href="/product"
                        className="text-[14px] text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                        See how the loop works →
                    </Link>
                </div>
            </section>
        </>
    );
}
