"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { AeloWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
    { href: "/product", label: "How it works" },
    { href: "/features", label: "Features" },
    { href: "/methodology", label: "Methodology" },
    { href: "/pricing", label: "Pricing" },
];

const EXPLORE_LINKS = [
    { href: "/solutions/founders", label: "For founders", note: "Know what buyers hear" },
    { href: "/solutions/marketing", label: "For marketing teams", note: "Turn evidence into a brief" },
    { href: "/solutions/agencies", label: "For agencies", note: "Show clients the receipt" },
    { href: "/india-index", label: "India visibility index", note: "Public category benchmarks" },
    { href: "/blog", label: "Field notes", note: "Research and methods" },
    { href: "/mcp", label: "MCP", note: "Ask Aelo from your tools" },
];

export function MarketingNav() {
    const pathname = usePathname();
    const [openExplore, setOpenExplore] = useState(false);
    const [openMobile, setOpenMobile] = useState(false);

    return (
        <header className="pointer-events-none sticky top-0 z-50 px-3 pt-3 [--accent-base:#a8cbe0] [--text-primary:#eff2ec]">
            <a
                href="#main-content"
                className="pointer-events-auto absolute left-4 top-3 z-[60] -translate-y-24 rounded-sm bg-[#eff2ec] px-4 py-2 text-sm font-semibold text-[#17201f] focus:translate-y-0"
            >
                Skip to content
            </a>

            <div className="pointer-events-auto relative mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#131717]/95 px-4 shadow-[0_12px_40px_rgba(0,0,0,.2)] backdrop-blur-2xl md:px-5">
                <Link href="/" className="rounded-full p-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-80">
                    <AeloWordmark size="md" />
                </Link>

                <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
                    {PRIMARY_LINKS.map((link) => {
                        const current = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={current ? "page" : undefined}
                                className={cn(
                                    "rounded-full px-3 py-2 text-sm font-medium transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                                    current ? "bg-[#eff2ec] text-[#17201f]" : "text-white/70 hover:bg-white/10 hover:text-white",
                                )}
                            >
                                {link.label}
                            </Link>
                        );
                    })}

                    <div
                        className="relative"
                        onMouseEnter={() => setOpenExplore(true)}
                        onMouseLeave={() => setOpenExplore(false)}
                    >
                        <button
                            type="button"
                            aria-expanded={openExplore}
                            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-white/70 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white"
                            onClick={() => setOpenExplore((value) => !value)}
                        >
                            Explore
                            <ChevronDown className={cn("size-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]", openExplore && "rotate-180")} />
                        </button>
                        {openExplore && (
                            <div className="absolute right-0 top-full w-[560px] pt-3">
                                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#bbc4bc] bg-[#e9ece7] p-3 text-[#1d2523] shadow-[0_24px_70px_rgba(0,0,0,.2)]">
                                    {EXPLORE_LINKS.map((link, index) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setOpenExplore(false)}
                                            className={cn(
                                                "rounded-xl border border-transparent p-4 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-[#adb8b0] hover:bg-[#f3f4ef]",
                                                index === 0 && "bg-[#dbe8ee]",
                                            )}
                                        >
                                            <span className="block text-sm font-semibold">{link.label}</span>
                                            <span className="mt-1 block text-xs text-[#53615d]">{link.note}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                <div className="flex items-center gap-2">
                    <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-medium text-white/70 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white sm:inline-flex">
                        Log in
                    </Link>
                    <Link href="/#scan" className="hidden rounded-full bg-[#a8cbe0] px-4 py-2 text-sm font-semibold text-[#17201f] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[#bdd9e8] sm:inline-flex">
                        Run one answer
                    </Link>
                    <button
                        type="button"
                        aria-label={openMobile ? "Close menu" : "Open menu"}
                        aria-expanded={openMobile}
                        className="relative flex size-10 items-center justify-center rounded-full bg-white/10 text-white lg:hidden"
                        onClick={() => setOpenMobile((value) => !value)}
                    >
                        <span className={cn("absolute h-px w-4 bg-current transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]", openMobile ? "translate-y-0 rotate-45" : "-translate-y-1.5")} />
                        <span className={cn("absolute h-px w-4 bg-current transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]", openMobile ? "opacity-0" : "opacity-100")} />
                        <span className={cn("absolute h-px w-4 bg-current transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]", openMobile ? "translate-y-0 -rotate-45" : "translate-y-1.5")} />
                    </button>
                </div>
            </div>

            <div
                aria-hidden={!openMobile}
                inert={!openMobile}
                className={cn(
                    "pointer-events-auto mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#131717]/95 backdrop-blur-3xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden",
                    openMobile ? "max-h-[720px] translate-y-0 opacity-100" : "max-h-0 -translate-y-4 border-transparent opacity-0",
                )}
            >
                <nav aria-label="Mobile" className="grid gap-2 p-4 sm:grid-cols-2">
                    {[...PRIMARY_LINKS, ...EXPLORE_LINKS].map((link, index) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpenMobile(false)}
                            className={cn(
                                "translate-y-0 rounded-2xl px-4 py-3 text-base font-medium text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10",
                                openMobile ? "opacity-100" : "translate-y-12 opacity-0",
                            )}
                            style={{ transitionDelay: `${Math.min(index * 45, 360)}ms` }}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link href="/#scan" onClick={() => setOpenMobile(false)} className="mt-2 rounded-2xl bg-[#a8cbe0] px-4 py-3 text-center text-base font-semibold text-[#17201f] sm:col-span-2">
                        Run a real scan
                    </Link>
                </nav>
            </div>
        </header>
    );
}
