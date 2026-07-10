import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewsletterSubscribe } from "@/components/marketing/newsletter-subscribe";

interface PublicScan {
    id:                     string;
    brand_name:             string;
    prompt:                 string;
    platform:               string;
    response:               string | null;
    brand_mentioned:        boolean | null;
    mention_position:       number | null;
    sentiment:              'positive' | 'neutral' | 'negative' | null;
    competitors_mentioned:  string[] | null;
    citations:              { url: string; title: string; isOwnDomain?: boolean }[] | null;
    error_message:          string | null;
    created_at:             string;
}

export const revalidate = 300; // 5 min

// Fetch server-side so the receipt renders instantly (no client loading spinner).
async function getScan(id: string): Promise<PublicScan | null> {
    if (!/^[a-f0-9-]{36}$/i.test(id)) return null;

    const db = createAdminClient();
    const { data } = await db
        .from('public_scans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    return (data as PublicScan | null) ?? null;
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
    const { id } = await params;
    const scan = await getScan(id);
    if (!scan) return { title: 'Scan not found · Aelo' };

    const verdict = scan.brand_mentioned
        ? `mentioned${scan.mention_position ? ` at #${scan.mention_position}` : ''}`
        : 'not mentioned';

    return {
        title: `${scan.brand_name} — ${verdict} on Gemini · Aelo`,
        description: `Live Gemini scan for "${scan.prompt}" — ${scan.brand_name} was ${verdict}. Verify the raw response yourself.`,
        openGraph: {
            title: `${scan.brand_name} — ${verdict} on Gemini`,
            description: `Live scan: "${scan.prompt}" — verify the raw response.`,
            type: 'article',
        },
    };
}

export default async function PublicScanPage(
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const scan = await getScan(id);
    if (!scan) notFound();

    const scanDate = new Date(scan.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    const verdictLabel = scan.error_message
        ? 'Failed'
        : scan.brand_mentioned
            ? scan.mention_position && scan.mention_position <= 3 ? 'Named early' : 'Named'
            : 'Not named';

    const verdictStyle = scan.error_message
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
                        {" — "}
                        <span className={scan.brand_mentioned === false ? 'text-[var(--data-red)]' : 'text-[var(--data-green)]'}>
                            {verdictLabel.toLowerCase()}
                        </span>
                    </h1>
                    <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl">
                        We asked Gemini {scan.brand_mentioned === false ? "and it didn't name" : "and it named"}{' '}
                        {scan.brand_name} for the prompt below. Verify yourself in 30 seconds by pasting the same prompt into Gemini.
                    </p>
                </div>

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
                            Reproduce on Gemini <ExternalLink className="w-2.5 h-2.5" />
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

                {scan.error_message && (
                    <div className="mb-6 rounded-md border border-[var(--data-red)]/30 bg-[var(--data-red-muted)] px-4 py-4 text-[13.5px] text-[var(--data-red)]">
                        Scan failed: {scan.error_message}. This is what Aelo shows when a
                        provider fails — no fabricated positive result.
                    </div>
                )}

                {/* Citations */}
                {(scan.citations?.length ?? 0) > 0 && (
                    <div className="mb-8 rounded-md border border-white/[0.08] bg-black overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-white/[0.06]">
                            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
                                Citations Gemini returned
                            </span>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                            {scan.citations!.slice(0, 10).map((c, i) => (
                                <a
                                    key={i}
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1.5 text-[12.5px] font-mono text-zinc-400 hover:text-white truncate"
                                >
                                    <span className="truncate">{c.title || c.url}</span>
                                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sage disclaimer */}
                <div className="mb-8 rounded-md border-l-2 border-[var(--accent-base)] bg-[var(--accent-muted)]/40 pl-4 pr-3 py-3 text-[13px] text-zinc-300 leading-relaxed italic">
                    LLM answers are non-deterministic — this scan is a sample, not a truth.
                    Running the same prompt again could shift the position by ±2 and the
                    sentiment by one bucket. That&apos;s why the receipt is here: verify any
                    claim yourself in 30 seconds.
                </div>

                {/* CTA — track over time */}
                <div className="rounded-lg border border-[var(--accent-base)]/40 bg-black p-6 mb-6">
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--accent-base)] mb-2">
                        Track this over time
                    </p>
                    <h2 className="text-xl font-medium text-white mb-2 tracking-tight">
                        This is one snapshot. Aelo tracks it forever.
                    </h2>
                    <p className="text-[14px] text-zinc-400 leading-relaxed mb-5">
                        Sign up (no card) and Aelo re-runs this prompt daily across ChatGPT, Gemini,
                        Claude, and Perplexity. You&apos;ll see when {scan.brand_name}&apos;s
                        position moves, when a new competitor enters the answer, or when the
                        sentiment shifts.
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

                {/* Newsletter — softer entry */}
                <NewsletterSubscribe source={`public-scan`} variant="footer" />

                {/* Micro footer — permalink for share */}
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
