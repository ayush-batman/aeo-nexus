import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ExternalLink } from "lucide-react";
import { readPublicScan } from "@/lib/convex/public-scan";
import { PendingReceipt } from "@/components/marketing/pending-receipt";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";
import { RadarPreview } from "@/components/marketing/radar-preview";
import { PLAN_CATALOG } from "@/lib/billing/plan-catalog";

export const dynamic = 'force-dynamic';
async function getScan(id: string) {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
    return readPublicScan(id);
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
    const { id } = await params;
    const scan = await getScan(id);
    if (!scan) return { title: 'Scan not found · Aelo' };

    const verdict = scan.status !== "complete" ? scan.status : scan.brand_mentioned
        ? `mentioned${scan.mention_position ? ` at #${scan.mention_position}` : ''}`
        : 'not mentioned';

    return {
        title: `${scan.brand_name}, ${verdict} on Gemini · Aelo`,
        description: `Live Gemini scan for "${scan.prompt}", ${scan.brand_name} was ${verdict}. Verify the raw response yourself.`,
        openGraph: {
            title: `${scan.brand_name}, ${verdict} on Gemini`,
            description: `Live scan: "${scan.prompt}", verify the raw response.`,
            type: 'article',
        },
    };
}

export default async function PublicScanPage(
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const radar = PLAN_CATALOG.starter;
    const scan = await getScan(id);
    if (!scan) notFound();

    const scanDate = new Date(scan.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    const pending = scan.status === 'queued' || scan.status === 'running';
    const failed = scan.status === 'failed' || Boolean(scan.error_message);
    const verdictLabel = pending ? 'Running' : failed
        ? 'Failed'
        : scan.brand_mentioned
            ? scan.mention_position && scan.mention_position <= 3 ? 'Named early' : 'Named'
            : 'Not named';

    const verdictStyle = pending || failed
        ? 'text-[var(--text-tertiary)] border-[var(--border-default)] bg-[var(--bg-raised)]'
        : scan.brand_mentioned
            ? 'text-[var(--data-green)] border-[var(--data-green)]/30 bg-[var(--data-green-muted)]'
            : 'text-[var(--data-red)] border-[var(--data-red)]/30 bg-[var(--data-red-muted)]';

    return (
        <article className="pt-20 pb-20 md:pt-28 md:pb-28 px-6">
            <div className="mx-auto max-w-2xl">
                {/* Front matter */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                        <span className="text-[var(--accent-base)]">Public receipt</span>
                        <span>·</span>
                        <time dateTime={scan.created_at}>{scanDate}</time>
                        <span>·</span>
                        <span>{scan.platform === 'gemini' ? 'Gemini' : scan.platform}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-medium tracking-tighter leading-[1.05] text-white mb-3 text-balance">
                        {scan.brand_name}
                        {", "}
                        <span className={pending || failed ? 'text-[var(--text-secondary)]' : scan.brand_mentioned === false ? 'text-[var(--data-red)]' : 'text-[var(--data-green)]'}>
                            {verdictLabel.toLowerCase()}
                        </span>
                    </h1>
                    <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl">
                        {pending ? "Your scan is running. This page will update when evidence is saved." : failed ? "The provider did not produce usable evidence. No visibility result is claimed." : "This receipt contains one sampled answer from the Gemini API. Consumer Gemini may answer differently; read the saved evidence below."}
                    </p>
                </div>

                {pending && <PendingReceipt />}

                {/* The prompt card */}
                <div className="mb-6 rounded-md border border-white/[0.08] bg-black overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">Prompt sent</span>
                        <a
                            href="https://gemini.google.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--accent-base)] hover:text-[var(--accent-hover)]"
                        >
                            Try in Gemini <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                    <div className="px-4 py-3 text-[15px] text-white font-medium leading-snug">
                        {scan.prompt}
                    </div>
                </div>

                {/* Verdict badges */}
                <div className="mb-6 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${verdictStyle}`}>
                        {verdictLabel}
                    </span>
                    {scan.brand_mentioned && scan.mention_position !== null && (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--border-default)] bg-[var(--bg-raised)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                            Position #{scan.mention_position}
                        </span>
                    )}
                    {scan.sentiment && scan.sentiment !== 'neutral' && (
                        <span className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${
                            scan.sentiment === 'positive'
                                ? 'text-[var(--data-green)] border-[var(--data-green)]/30 bg-[var(--data-green-muted)]'
                                : 'text-[var(--data-red)] border-[var(--data-red)]/30 bg-[var(--data-red-muted)]'
                        }`}>
                            {scan.sentiment}
                        </span>
                    )}
                    {(scan.competitors_mentioned?.length ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--border-default)] bg-[var(--bg-raised)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                            vs {scan.competitors_mentioned!.slice(0, 3).join(', ')}
                        </span>
                    )}
                </div>

                {/* Raw response */}
                {scan.response && (
                    <div className="mb-6 rounded-md border border-white/[0.08] bg-black overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/[0.06]">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                Verbatim response from Gemini
                            </span>
                        </div>
                        <pre className="px-4 py-4 text-[13.5px] text-zinc-200 whitespace-pre-wrap leading-relaxed font-normal">
                            {scan.response}
                        </pre>
                    </div>
                )}

                {failed && (
                    <div className="mb-6 rounded-md border border-[var(--data-red)]/30 bg-[var(--data-red-muted)] px-4 py-4 text-[13.5px] text-[var(--data-red)]">
                        Scan failed: {scan.error_message || 'No usable provider response was saved.'} This is what Aelo shows when a
                        provider fails, no fabricated positive result.
                    </div>
                )}

                {/* Citations */}
                {(scan.citations?.length ?? 0) > 0 && (
                    <div className="mb-8 rounded-md border border-white/[0.08] bg-black overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/[0.06]">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                Evidence links in this answer
                            </span>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                            {scan.citations!.slice(0, 10).map((c, i) => {
                                const unsafe = c.fetchValidation === 'invalid' || c.fetchValidation === 'blocked' || !/^https?:\/\//i.test(c.url);
                                const content = <>
                                    <span className="truncate">{c.title || c.url}</span>
                                    <span className="shrink-0 text-[9px] uppercase tracking-wide text-zinc-600">
                                        {c.provenance === 'provider_citation'
                                            ? 'Provider citation'
                                            : c.provenance === 'link_mentioned'
                                                ? 'Link mentioned'
                                                : 'Unverified'}
                                    </span>
                                    {!unsafe && <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />}
                                </>;
                                return unsafe ? (
                                    <div key={i} className="flex items-center gap-1.5 text-[12.5px] font-mono text-zinc-600 truncate">
                                        {content}
                                    </div>
                                ) : (
                                    <a
                                        key={i}
                                        href={c.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 text-[12.5px] font-mono text-zinc-400 hover:text-white truncate"
                                    >
                                        {content}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Sage disclaimer */}
                <div className="mb-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[13px] text-zinc-300 leading-relaxed italic">
                    LLM answers are non-deterministic, this scan is a sample, not a truth.
                    One answer is not a reliable visibility score. Repeated measurements can show variation;
                    this receipt does not establish a likely rank range or a trend.
                </div>

                <RadarPreview
                    brandName={scan.brand_name}
                    prompt={scan.prompt}
                    status={scan.status}
                    brandMentioned={scan.brand_mentioned}
                    citations={scan.citations ?? []}
                />

                {/* CTA, track over time */}
                <div className="rounded-lg border border-[var(--accent-base)]/40 bg-black p-6 mb-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent-base)] mb-2">
                        Track this over time
                    </p>
                    <h2 className="text-xl font-medium text-white mb-2 tracking-tight">
                        This is one snapshot. Radar measures it repeatedly.
                    </h2>
                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-5">
                        Start free with Gemini. {radar.name} adds {radar.scanPromise.toLowerCase()} across {radar.engines.join(', ')} when those providers are available, with sample counts, confidence ranges and source evidence.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                            href={`/signup?brand=${encodeURIComponent(scan.brand_name)}`}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[14px] bg-[var(--accent-base)] text-[var(--text-on-accent)] hover:bg-[var(--accent-hover)] transition-colors font-medium"
                        >
                            Track {scan.brand_name} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                            href="/methodology"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] text-zinc-400 hover:text-white transition-colors"
                        >
                            How we measure →
                        </Link>
                    </div>
                </div>

                {/* Newsletter, softer entry */}
                <NewsletterSubscribe source={`public-scan`} variant="footer" />

                {/* Micro footer, permalink for share */}
                <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                    <Link href="/" className="text-[13px] font-mono text-zinc-500 hover:text-white transition-colors">
                        ← Run your own free scan
                    </Link>
                    <span className="text-[11px] font-mono text-zinc-600">
                        Permalink · shareable
                    </span>
                </div>
            </div>
        </article>
    );
}
