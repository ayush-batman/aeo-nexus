import Link from "next/link";
import { ArrowRight, Zap, Search, ClipboardList, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Docs · Aelo",
    description: "Quickstart: from signup to your first receipt in under 10 minutes.",
};

const STEPS = [
    {
        icon: Zap,
        title: "1. Create your workspace",
        body: "Sign up (no card). Auto-onboarding provisions your first workspace with sensible defaults. If you know your competitors and website, add them in the first minute — the scanner uses them to attribute citations correctly.",
    },
    {
        icon: Search,
        title: "2. Add target prompts",
        body: "Head to LLM Tracker → Add prompts. Aelo's prompt library seeds 30+ high-intent queries generated for your category. You can edit, star, or add your own. Every scan runs against every starred prompt.",
    },
    {
        icon: ClipboardList,
        title: "3. Run your first scan",
        body: "Click Run scan on any prompt. Aelo hits Gemini live (Radar) or all four providers in parallel (Command). Analyzer extracts mentioned/position/sentiment/competitors/citations. Nothing is fabricated — if a provider fails, you'll see a real error, not a mock.",
    },
    {
        icon: CheckCircle2,
        title: "4. Log your first intervention",
        body: "Ship something — a landing page, a Reddit reply, a schema block. Come back and log it in /dashboard/interventions with the target prompt(s) it should move. Aelo freezes a baseline snapshot at that moment. Hit Measure a week later to get the receipt.",
    },
];

export default function DocsPage() {
    return (
        <>
            <section className="pt-20 pb-12 md:pt-28 md:pb-16 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        Docs · Quickstart
                    </p>
                    <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4 text-balance">
                        From signup to your first receipt in under 10 minutes.
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        Full API and integration docs are on the way. In the meantime, here is the
                        clean happy path.
                    </p>
                </div>
            </section>

            <section className="pb-24 px-6">
                <div className="mx-auto max-w-3xl space-y-4">
                    {STEPS.map((s, i) => (
                        <div key={i} className="rounded-lg border border-white/[0.06] bg-black p-6 flex gap-5">
                            <div className="flex-shrink-0 w-10 h-10 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center text-white">
                                <s.icon className="w-4 h-4" strokeWidth={1.5} />
                            </div>
                            <div>
                                <div className="text-[16px] font-medium text-white tracking-tight mb-1.5">
                                    {s.title}
                                </div>
                                <div className="text-[14px] text-zinc-400 leading-relaxed">
                                    {s.body}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mx-auto max-w-3xl mt-16 rounded-lg border border-white/[0.06] bg-[#050506] p-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
                        Something not covered?
                    </p>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">
                        Email us at <span className="font-mono text-zinc-200">docs@aelo.sh</span>.
                        We reply within a day, and every question becomes a doc entry.
                    </p>
                    <div className="mt-4">
                        <Link href="/contact" className="text-[13px] text-[var(--accent-base)] hover:underline inline-flex items-center gap-1">
                            Book a walkthrough <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
