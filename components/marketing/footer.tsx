import Link from "next/link";

import { AeloWordmark } from "@/components/brand/logo";

const LINKS = [
    { title: "Product", items: [["How it works", "/product"], ["Features", "/features"], ["Pricing", "/pricing"], ["Methodology", "/methodology"]] },
    { title: "Explore", items: [["India index", "/india-index"], ["Field notes", "/blog"], ["MCP", "/mcp"], ["Changelog", "/changelog"]] },
    { title: "Company", items: [["About", "/about"], ["Manifesto", "/manifesto"], ["Security", "/security"], ["Contact", "/contact"]] },
];

export function MarketingFooter() {
    return (
        <footer className="bg-[#131717] px-4 pb-4 pt-16 text-[#eff2ec] [--accent-base:#a8cbe0] [--text-primary:#eff2ec] md:px-6 md:pt-24">
            <div className="mx-auto max-w-6xl">
                <div className="mb-16 grid overflow-hidden rounded-sm bg-[#f3f1e9] text-[#1d2523] md:grid-cols-[1.4fr_0.6fr]">
                    <div className="p-8 md:p-12">
                        <p className="font-mono text-xs uppercase tracking-widest text-[#586560]">One question. Real evidence.</p>
                        <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">Read what AI tells your next buyer.</h2>
                    </div>
                    <div className="flex items-end bg-[#a8cbe0] p-8 md:justify-end md:p-12">
                        <Link href="/#scan" className="inline-flex rounded-sm bg-[#131717] px-5 py-3 text-base font-semibold text-[#eff2ec] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1">Run one real answer</Link>
                    </div>
                </div>

                <div className="grid gap-12 border-t border-white/15 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
                    <div>
                        <AeloWordmark size="lg" />
                        <p className="mt-5 max-w-sm text-base leading-relaxed text-white/60">Evidence for how ChatGPT, Gemini, Claude and Perplexity answer about your brand.</p>
                        <p className="mt-5 inline-flex border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-widest text-white/60">Engine availability is reported on every scan</p>
                    </div>
                    {LINKS.map((column) => (
                        <div key={column.title}>
                            <p className="font-mono text-xs uppercase tracking-widest text-[#a8cbe0]">{column.title}</p>
                            <ul className="mt-4 space-y-3">
                                {column.items.map(([label, href]) => (
                                    <li key={href}>
                                        <Link href={href} className="text-sm text-white/65 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-white">{label}</Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 border-t border-white/15 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} Aelo. Built in India for teams everywhere.</p>
                    <div className="flex gap-5"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link></div>
                </div>
            </div>
        </footer>
    );
}
