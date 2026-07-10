import Link from "next/link";
import type { Metadata } from "next";
import { Download } from "lucide-react";

export const metadata: Metadata = {
    title: "Brand · Aelo",
    description: "Aelo brand assets — mark, wordmark, social banners. Direct downloads. No logo abuse.",
};

// Press kit / brand page. Sage-clean: no marketing copy, just the assets
// with straight-line rules for use.

interface Asset {
    id:          string;
    label:       string;
    filename:    string;
    format:      'SVG';
    intendedUse: string;
    dimensions:  string;
    // preview background (light/dark) — some assets need the opposite
    bg:          'dark' | 'light';
}

const MARKS: Asset[] = [
    { id: 'mark',              label: 'Mark',              filename: 'mark.svg',              format: 'SVG', intendedUse: 'Default — beacon accent line', dimensions: '512 × 512', bg: 'dark' },
    { id: 'mark-mono-white',   label: 'Mark · mono white', filename: 'mark-mono-white.svg',   format: 'SVG', intendedUse: 'Dark backgrounds',           dimensions: '512 × 512', bg: 'dark' },
    { id: 'mark-mono-black',   label: 'Mark · mono black', filename: 'mark-mono-black.svg',   format: 'SVG', intendedUse: 'Light backgrounds',          dimensions: '512 × 512', bg: 'light' },
];

const WORDMARKS: Asset[] = [
    { id: 'wordmark',              label: 'Wordmark',              filename: 'wordmark.svg',              format: 'SVG', intendedUse: 'Default — beacon accent line', dimensions: '360 × 120', bg: 'dark' },
    { id: 'wordmark-mono-white',   label: 'Wordmark · mono white', filename: 'wordmark-mono-white.svg',   format: 'SVG', intendedUse: 'Dark backgrounds',           dimensions: '360 × 120', bg: 'dark' },
    { id: 'wordmark-mono-black',   label: 'Wordmark · mono black', filename: 'wordmark-mono-black.svg',   format: 'SVG', intendedUse: 'Light backgrounds',          dimensions: '360 × 120', bg: 'light' },
];

const SOCIAL: Asset[] = [
    { id: 'favicon',         label: 'Favicon',         filename: 'favicon.svg',         format: 'SVG', intendedUse: 'Browser tab · rounded chip',      dimensions: '32 × 32',    bg: 'dark' },
    { id: 'social-square',   label: 'Social square',   filename: 'social-square.svg',   format: 'SVG', intendedUse: 'Twitter/X + LinkedIn avatar',    dimensions: '1024 × 1024', bg: 'dark' },
    { id: 'twitter-banner',  label: 'X banner',        filename: 'twitter-banner.svg',  format: 'SVG', intendedUse: 'Twitter/X header',               dimensions: '1500 × 500',  bg: 'dark' },
    { id: 'linkedin-banner', label: 'LinkedIn banner', filename: 'linkedin-banner.svg', format: 'SVG', intendedUse: 'LinkedIn cover',                 dimensions: '1584 × 396',  bg: 'dark' },
];

export default function BrandPage() {
    return (
        <>
            {/* Hero */}
            <section className="pt-20 pb-10 md:pt-28 md:pb-14 px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        Brand · Press kit
                    </p>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white mb-4 text-balance">
                        Aelo brand assets.
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 max-w-2xl leading-relaxed">
                        Marks, wordmark, social banners. All SVG — infinitely scalable, editable
                        in any vector tool. Use them as-is or convert to PNG/JPG with any
                        online tool. Rules at the bottom.
                    </p>
                </div>
            </section>

            {/* Marks */}
            <AssetGrid label="01 · Mark" assets={MARKS} />

            {/* Wordmarks */}
            <AssetGrid label="02 · Wordmark" assets={WORDMARKS} />

            {/* Social */}
            <AssetGrid label="03 · Social & favicon" assets={SOCIAL} />

            {/* Colors */}
            <section className="py-16 border-t border-white/5 bg-[#050506] px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        04 · Colors
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-8">
                        Two colors do most of the work.
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <ColorCard name="Beacon"           hex="#E5D3A6" role="Accent · one per view"     borderColor />
                        <ColorCard name="Sage black"       hex="#0A0A0B" role="Canvas · dominant"          borderColor />
                        <ColorCard name="Data red"         hex="#D43636" role="Negative · warnings only"   />
                        <ColorCard name="Data green"       hex="#5EC08C" role="Confirmed · verdicts only"  />
                    </div>
                </div>
            </section>

            {/* Typography */}
            <section className="py-16 border-t border-white/5 px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        05 · Typography
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-8">
                        Inter for prose. JetBrains Mono for signals.
                    </h2>
                    <div className="space-y-3">
                        <FontRow family="Inter"           weight="500 (Medium)" sample="See how ChatGPT, Gemini, Claude and Perplexity actually answer." />
                        <FontRow family="Inter"           weight="400 (Regular)" sample="Aelo is the honest measurement layer for AI answer visibility." />
                        <FontRow family="JetBrains Mono"  weight="400" sample="AI VISIBILITY · HONEST DATA · JULY 2026" />
                    </div>
                </div>
            </section>

            {/* Rules */}
            <section className="py-16 border-t border-white/5 bg-[#050506] px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        06 · Rules
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-8">
                        A short list. No 40-page PDF.
                    </h2>
                    <div className="space-y-2">
                        <Rule ok body="Use the beacon-accent mark on dark backgrounds. Default." />
                        <Rule ok body="Mono variants on backgrounds that fight the beacon color." />
                        <Rule ok body="Give the mark at least the height of the mark itself as clear space around it." />
                        <Rule ok body="Wordmark reads 'aelo' — always lowercase, always." />
                        <Rule    body="Don't rotate or skew the mark. The apex points up." />
                        <Rule    body="Don't recolor either half — the beacon line is the point." />
                        <Rule    body="Don't add drop-shadows, glows, or gradients. Sage archetype." />
                        <Rule    body="Don't lock the mark inside another shape (circle, square) unless it's the favicon variant." />
                    </div>
                </div>
            </section>

            {/* Voice */}
            <section className="py-16 border-t border-white/5 px-6">
                <div className="mx-auto max-w-3xl">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-3">
                        07 · Voice
                    </p>
                    <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-4">
                        Sage · Magician.
                    </h2>
                    <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl mb-6">
                        Aelo speaks like an instrument, not a salesperson. Numbers before adjectives.
                        Claims before promises. The receipt is the argument.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <VoiceCard tone="Say" items={[
                            "Every number, one click from its receipt.",
                            "Zero fabricated data.",
                            "Trust the receipt, not the vibes.",
                            "Nothing is smoothed. Nothing is averaged unless you asked.",
                        ]}/>
                        <VoiceCard tone="Don't say" items={[
                            "Revolutionary AI visibility platform!",
                            "Unlock your brand's AI potential 🚀",
                            "Game-changing insights",
                            "AI-powered brand intelligence at scale",
                        ]}/>
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="py-12 border-t border-white/5 px-6">
                <div className="mx-auto max-w-3xl rounded-lg border border-white/[0.06] bg-[#050506] p-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-2">
                        08 · Press
                    </p>
                    <p className="text-[14px] text-zinc-400 leading-relaxed">
                        Writing about Aelo, referencing an India Index number, or building an
                        integration? Email <span className="font-mono text-zinc-200">press@aelo.sh</span> —
                        we reply same day, and we&apos;ll happily point you to a real customer
                        (with their permission) or a specific receipt to cite.
                    </p>
                    <div className="mt-4">
                        <Link href="/contact" className="text-[13px] text-[var(--accent-base)] hover:underline">
                            Open a conversation →
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}

function AssetGrid({ label, assets }: { label: string; assets: Asset[] }) {
    return (
        <section className="py-10 border-t border-white/5 px-6">
            <div className="mx-auto max-w-3xl">
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                    {label}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                </div>
            </div>
        </section>
    );
}

function AssetCard({ asset }: { asset: Asset }) {
    const previewBg = asset.bg === 'light' ? 'bg-white' : 'bg-black';
    return (
        <div className="rounded-md border border-white/[0.06] bg-black overflow-hidden">
            <div className={`h-40 flex items-center justify-center ${previewBg}`}>
                <img
                    src={`/brand/${asset.filename}`}
                    alt={asset.label}
                    className="max-h-[70%] max-w-[70%] object-contain"
                />
            </div>
            <div className="px-4 py-3 border-t border-white/[0.06]">
                <div className="flex items-baseline justify-between mb-1">
                    <div className="text-[14px] font-medium text-white">{asset.label}</div>
                    <div className="text-[10px] font-mono text-zinc-500">{asset.format}</div>
                </div>
                <div className="text-[11.5px] text-zinc-500 leading-relaxed mb-3">
                    {asset.intendedUse} · <span className="font-mono">{asset.dimensions}</span>
                </div>
                <a
                    href={`/brand/${asset.filename}`}
                    download={asset.filename}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent-base)] hover:text-[var(--accent-hover)]"
                >
                    <Download className="w-3 h-3" />
                    Download {asset.format}
                </a>
            </div>
        </div>
    );
}

function ColorCard({ name, hex, role, borderColor }: { name: string; hex: string; role: string; borderColor?: boolean }) {
    return (
        <div className={`rounded-md border ${borderColor ? 'border-white/10' : 'border-white/[0.06]'} bg-black overflow-hidden`}>
            <div className="h-20" style={{ backgroundColor: hex }} />
            <div className="px-3 py-3">
                <div className="text-[13px] font-medium text-white">{name}</div>
                <div className="mt-0.5 text-[11px] font-mono text-zinc-500">{hex}</div>
                <div className="mt-2 text-[10.5px] text-zinc-500 leading-tight">{role}</div>
            </div>
        </div>
    );
}

function FontRow({ family, weight, sample }: { family: string; weight: string; sample: string }) {
    const isMono = family.toLowerCase().includes('mono');
    return (
        <div className="rounded-md border border-white/[0.06] bg-black px-4 py-4">
            <div className="flex items-baseline gap-3 mb-2 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                <span>{family}</span>
                <span>·</span>
                <span>{weight}</span>
            </div>
            <div
                className="text-[18px] text-white leading-snug"
                style={{ fontFamily: isMono ? '"JetBrains Mono", ui-monospace, monospace' : 'Inter, sans-serif' }}
            >
                {sample}
            </div>
        </div>
    );
}

function Rule({ ok, body }: { ok?: boolean; body: string }) {
    return (
        <div className="flex items-start gap-3 py-2 border-b border-white/[0.05] last:border-b-0">
            <span className={`mt-0.5 text-[10px] font-mono uppercase tracking-[0.12em] flex-shrink-0 min-w-[36px] ${ok ? 'text-[var(--data-green)]' : 'text-[var(--data-red)]'}`}>
                {ok ? 'do' : 'don\'t'}
            </span>
            <span className="text-[14px] text-zinc-300 leading-relaxed">{body}</span>
        </div>
    );
}

function VoiceCard({ tone, items }: { tone: 'Say' | 'Don\'t say'; items: string[] }) {
    const isGood = tone === 'Say';
    return (
        <div className={`rounded-md border ${isGood ? 'border-[var(--data-green)]/25 bg-[var(--data-green-muted)]/30' : 'border-[var(--data-red)]/25 bg-[var(--data-red-muted)]/30'} p-4`}>
            <div className={`text-[10px] font-mono uppercase tracking-[0.14em] mb-3 ${isGood ? 'text-[var(--data-green)]' : 'text-[var(--data-red)]'}`}>
                {tone}
            </div>
            <ul className="space-y-2">
                {items.map((it, i) => (
                    <li key={i} className="text-[13px] text-zinc-300 leading-relaxed italic">
                        &ldquo;{it}&rdquo;
                    </li>
                ))}
            </ul>
        </div>
    );
}
