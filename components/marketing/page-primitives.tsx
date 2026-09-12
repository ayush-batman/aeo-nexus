import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "dark" | "light" | "blue";

const toneClasses: Record<Tone, string> = {
    dark: "bg-[#131717] text-[#eff2ec]",
    light: "bg-[#e9ece7] text-[#1d2523]",
    blue: "bg-[#dbe8ee] text-[#1d2523]",
};

export function MarketingHero({
    eyebrow,
    title,
    copy,
    actions,
    aside,
    tone = "dark",
}: {
    eyebrow: string;
    title: ReactNode;
    copy: ReactNode;
    actions?: ReactNode;
    aside?: ReactNode;
    tone?: Tone;
}) {
    return (
        <section className={`${toneClasses[tone]} px-4 pb-20 pt-20 md:px-6 md:pb-24 md:pt-24`}>
            <div className={`mx-auto grid max-w-6xl gap-12 ${aside ? "lg:grid-cols-[1fr_.72fr] lg:items-end" : ""}`}>
                <div className="min-w-0">
                    <p className={`font-mono text-xs uppercase tracking-widest ${tone === "dark" ? "text-[#a8cbe0]" : "text-[#416a88]"}`}>{eyebrow}</p>
                    <h1 className="mt-5 max-w-[760px] text-5xl font-semibold tracking-[-.045em] md:text-7xl">{title}</h1>
                </div>
                <div className={`min-w-0 ${aside ? "lg:pb-2" : "max-w-[680px]"}`}>
                    <div className={`text-lg leading-relaxed ${tone === "dark" ? "text-[#a4aeaa]" : "text-[#53615d]"}`}>{copy}</div>
                    {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
                    {aside}
                </div>
            </div>
        </section>
    );
}

export function MarketingSectionHeading({
    eyebrow,
    title,
    copy,
    light = false,
}: {
    eyebrow: string;
    title: ReactNode;
    copy?: ReactNode;
    light?: boolean;
}) {
    return (
        <div className="min-w-0 max-w-[680px]">
            <p className={`font-mono text-xs uppercase tracking-widest ${light ? "text-[#a8cbe0]" : "text-[#416a88]"}`}>{eyebrow}</p>
            <h2 className="mt-4 break-words text-4xl font-semibold tracking-tight md:text-5xl">{title}</h2>
            {copy ? <div className={`mt-5 text-base leading-relaxed ${light ? "text-[#a4aeaa]" : "text-[#53615d]"}`}>{copy}</div> : null}
        </div>
    );
}

export function MarketingCTA({ href, children, inverted = false }: { href: string; children: ReactNode; inverted?: boolean }) {
    return (
        <Link
            href={href}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 py-2 text-base font-semibold transition-[background-color,color,transform] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 ${inverted ? "bg-[#eff2ec] text-[#17201f] hover:bg-white focus-visible:ring-[#eff2ec] focus-visible:ring-offset-[#131717]" : "bg-[#416a88] text-white hover:bg-[#315873] focus-visible:ring-[#416a88] focus-visible:ring-offset-[#e9ece7]"}`}
        >
            {children}<ArrowRight aria-hidden="true" className="size-4" />
        </Link>
    );
}

export function EvidencePanel({ eyebrow, title, children, className = "" }: { eyebrow?: string; title?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <article className={`min-w-0 bg-[#fbfaf5] p-6 text-[#1d2523] shadow-[0_20px_70px_rgba(29,37,35,.10)] md:p-8 ${className}`}>
            {eyebrow || title ? (
                <header className="border-b border-[#d2d7cf] pb-5">
                    {eyebrow ? <p className="font-mono text-xs uppercase tracking-widest text-[#65736f]">{eyebrow}</p> : null}
                    {title ? <h3 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h3> : null}
                </header>
            ) : null}
            <div className={eyebrow || title ? "mt-6" : ""}>{children}</div>
        </article>
    );
}
