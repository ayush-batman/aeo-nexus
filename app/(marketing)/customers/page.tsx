import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Customers · Aelo",
    description: "Join the design partner cohort. First customers get a strategist, a discount, and a case study.",
};

export default function CustomersPage() {
    return (
        <>
            <section className="pt-24 pb-16 md:pt-32 md:pb-20 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        Customers
                    </p>
                    <h1 className="text-4xl md:text-6xl font-medium tracking-tighter leading-[1.02] text-white text-balance mb-5">
                        We&apos;re signing our first cohort. Come with us.
                    </h1>
                    <p className="text-[16px] md:text-[18px] text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        Aelo is early, early enough that the first customers get a strategist,
                        a discount, and a real hand in what we build next.
                    </p>
                </div>
            </section>

            <section className="pb-24 px-6">
                <div className="mx-auto max-w-3xl rounded-lg border border-[var(--accent-base)]/40 bg-black p-8 md:p-10">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--accent-base)] mb-3">
                        Design partner cohort · 10 slots
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-4">
                        What you get.
                    </h2>
                    <ul className="space-y-2.5 text-[14px] text-zinc-300 leading-snug mb-8">
                        <li>· Concierge-level support at Command pricing for 12 months.</li>
                        <li>· A named strategist who runs the loop with you, not just onboarding.</li>
                        <li>· Weekly reviews. Direct Slack. First read on every roadmap item.</li>
                        <li>· A public case study once we hit a real receipt (only if you approve it).</li>
                        <li>· ₹0 setup, cancel any time. We&apos;re earning the seat.</li>
                    </ul>

                    <div className="border-t border-white/5 pt-6">
                        <p className="text-[12px] text-zinc-500 mb-4 font-mono uppercase tracking-[0.14em]">
                            The kind of team we&apos;re looking for
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { t: "SaaS founders", b: "Especially B2B tools where AI recommendation drives the buying journey." },
                                { t: "India D2C / consumer brands", b: "Where AI-answer visibility can materially shift consideration." },
                                { t: "In-house marketing teams", b: "Willing to run interventions and share the receipts with your CMO." },
                                { t: "Agencies with 3+ AEO-curious clients", b: "White-label available for the cohort." },
                            ].map(t => (
                                <div key={t.t} className="rounded-md border border-white/[0.06] bg-[#050506] p-4">
                                    <div className="text-[13.5px] font-medium text-white mb-1">{t.t}</div>
                                    <div className="text-[12.5px] text-zinc-500 leading-relaxed">{t.b}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                        <Link
                            href="/contact?interest=concierge"
                            className="text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-6 py-3 rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                            Apply <ArrowRight className="w-4 h-4" />
                        </Link>
                        <span className="text-[12px] font-mono text-zinc-600">
                            Cohort application · 2-minute form · reply within 24h
                        </span>
                    </div>
                </div>
            </section>
        </>
    );
}
