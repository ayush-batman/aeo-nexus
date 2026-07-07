"use client";

import Link from "next/link";
import { useState } from "react";
import { AeloWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { ChevronDown, Menu, X } from "lucide-react";

// Sage nav: quiet, structured, no huge dropdowns. Solutions is the only
// grouped item — everything else is a direct link.

const SOLUTIONS = [
    { href: "/solutions/founders",  title: "SaaS Founders",  subtitle: "Own the answer buyers ask AI." },
    { href: "/solutions/marketing", title: "Marketing Teams", subtitle: "Move visibility with prescribed actions." },
    { href: "/solutions/agencies",  title: "Agencies",       subtitle: "Deliver AEO as a service, multi-workspace." },
    { href: "/solutions/india",     title: "India-first Brands", subtitle: "₹ pricing, Razorpay, Indian-query nuance." },
];

const NAV_LINKS = [
    { href: "/product",     label: "Product" },
    { href: "/pricing",     label: "Pricing" },
    { href: "/india-index", label: "India Index" },
    { href: "/methodology", label: "Methodology" },
    { href: "/blog",        label: "Blog" },
    { href: "/manifesto",   label: "Manifesto" },
];

export function MarketingNav() {
    const [openSolutions, setOpenSolutions] = useState(false);
    const [openMobile, setOpenMobile] = useState(false);

    return (
        <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
            <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
                <Link href="/" className="group transition-opacity hover:opacity-90">
                    <AeloWordmark size="md" />
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {/* Solutions dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setOpenSolutions(true)}
                        onMouseLeave={() => setOpenSolutions(false)}
                    >
                        <button
                            type="button"
                            className="flex items-center gap-1 text-[13px] text-zinc-400 hover:text-white transition-colors"
                            onClick={() => setOpenSolutions(v => !v)}
                        >
                            Solutions <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openSolutions && "rotate-180")} />
                        </button>
                        {openSolutions && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[520px]">
                                <div className="rounded-lg border border-white/10 bg-[#0A0A0A] shadow-[0_12px_40px_rgba(0,0,0,0.65)] p-2 grid grid-cols-2 gap-1">
                                    {SOLUTIONS.map(s => (
                                        <Link
                                            key={s.href}
                                            href={s.href}
                                            className="rounded-md p-3 hover:bg-white/[0.04] transition-colors"
                                            onClick={() => setOpenSolutions(false)}
                                        >
                                            <div className="text-[13px] font-medium text-white">{s.title}</div>
                                            <div className="text-[12px] text-zinc-500 mt-0.5 leading-snug">{s.subtitle}</div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {NAV_LINKS.map(l => (
                        <Link key={l.href} href={l.href} className="text-[13px] text-zinc-400 hover:text-white transition-colors">
                            {l.label}
                        </Link>
                    ))}
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    <Link href="/login" className="hidden sm:inline text-[13px] text-zinc-400 hover:text-white transition-colors">
                        Log in
                    </Link>
                    <Link
                        href="/signup"
                        className="text-[13px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-3.5 py-1.5 rounded-md font-medium hover:bg-[var(--accent-hover)] transition-colors"
                    >
                        Start free
                    </Link>
                    <button
                        type="button"
                        className="md:hidden text-zinc-400 hover:text-white"
                        onClick={() => setOpenMobile(v => !v)}
                        aria-label="Menu"
                    >
                        {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            {openMobile && (
                <div className="md:hidden border-t border-white/5 bg-black">
                    <div className="mx-auto max-w-6xl px-6 py-4 space-y-1">
                        <div className="pt-1 pb-2 text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500">Solutions</div>
                        {SOLUTIONS.map(s => (
                            <Link
                                key={s.href}
                                href={s.href}
                                onClick={() => setOpenMobile(false)}
                                className="block py-2 text-[14px] text-zinc-300 hover:text-white"
                            >
                                {s.title}
                            </Link>
                        ))}
                        <div className="border-t border-white/5 my-3" />
                        {NAV_LINKS.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setOpenMobile(false)}
                                className="block py-2 text-[14px] text-zinc-300 hover:text-white"
                            >
                                {l.label}
                            </Link>
                        ))}
                        <Link
                            href="/login"
                            onClick={() => setOpenMobile(false)}
                            className="block py-2 text-[14px] text-zinc-300 hover:text-white"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
