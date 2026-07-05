import Link from "next/link";
import { AeloMark } from "@/components/brand/logo";

// Sage footer: comprehensive, structured, quiet. All the links a serious
// visitor would look for. No motivational copy.

const COLS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
    {
        title: "Product",
        links: [
            { href: "/product",     label: "How Aelo works" },
            { href: "/pricing",     label: "Pricing" },
            { href: "/india-index", label: "India AI Visibility Index" },
            { href: "/changelog",   label: "Changelog" },
            { href: "/docs",        label: "Docs" },
        ],
    },
    {
        title: "Solutions",
        links: [
            { href: "/solutions/founders",  label: "SaaS Founders" },
            { href: "/solutions/marketing", label: "Marketing Teams" },
            { href: "/solutions/agencies",  label: "Agencies" },
            { href: "/solutions/india",     label: "India-first Brands" },
        ],
    },
    {
        title: "Company",
        links: [
            { href: "/about",     label: "About" },
            { href: "/manifesto", label: "Manifesto" },
            { href: "/customers", label: "Customers" },
            { href: "/contact",   label: "Contact" },
        ],
    },
    {
        title: "Legal",
        links: [
            { href: "/privacy",   label: "Privacy" },
            { href: "/terms",     label: "Terms" },
            { href: "/security",  label: "Security" },
        ],
    },
];

export function MarketingFooter() {
    return (
        <footer className="border-t border-white/5 bg-black">
            <div className="mx-auto max-w-6xl px-6 py-16">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                    {/* Brand column (spans 2 on desktop) */}
                    <div className="col-span-2 md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 text-white">
                            <AeloMark size={22} />
                            <span className="text-[15px] font-medium tracking-tight">aelo</span>
                        </div>
                        <p className="text-[13px] text-zinc-500 leading-relaxed max-w-[280px]">
                            The instrument for measuring — and moving — your brand&apos;s presence in AI answers.
                        </p>
                        <div className="pt-2 flex items-center gap-3 text-[11px] text-zinc-600 font-mono">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                All systems operational
                            </span>
                        </div>
                    </div>

                    {/* Link columns */}
                    {COLS.map(col => (
                        <div key={col.title}>
                            <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-3">
                                {col.title}
                            </div>
                            <ul className="space-y-2">
                                {col.links.map(l => (
                                    <li key={l.href}>
                                        <Link
                                            href={l.href}
                                            className="text-[13px] text-zinc-400 hover:text-white transition-colors"
                                        >
                                            {l.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-zinc-500">
                    <div>© {new Date().getFullYear()} Aelo Inc. Instrument for AI answer engineering.</div>
                    <div className="font-mono text-[11px] text-zinc-600">
                        Made in India · Priced in ₹
                    </div>
                </div>
            </div>
        </footer>
    );
}
