import Link from "next/link";
import { ArrowRight, ExternalLink, LockKeyhole } from "lucide-react";

type PreviewCitation = {
    url: string;
    title?: string | null;
    provenance?: string | null;
    fetchValidation?: string | null;
};

type RadarPreviewProps = {
    brandName: string;
    prompt: string;
    status: string;
    brandMentioned: boolean | null;
    citations: PreviewCitation[];
};

const ENGINES = ["Gemini", "ChatGPT", "Claude", "Perplexity"] as const;

function sourceHost(url: string) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

export function RadarPreview({
    brandName,
    prompt,
    status,
    brandMentioned,
    citations,
}: RadarPreviewProps) {
    const completed = status === "complete";
    const failed = status === "failed";
    const providerSources = citations.filter(
        (citation) => citation.provenance === "provider_citation",
    );
    const safeSources = providerSources.filter(
        (citation) =>
            /^https?:\/\//i.test(citation.url) &&
            citation.fetchValidation !== "invalid" &&
            citation.fetchValidation !== "blocked",
    );
    const nextStep = !completed
        ? "Retry the failed sample before drawing a conclusion."
        : brandMentioned
            ? "Repeat this question across assistants before treating the mention as stable."
            : "Repeat this question, then inspect which sources appear when competitors are named."

    return (
        <section
            aria-labelledby="radar-preview-heading"
            className="mb-8 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]"
        >
            <div className="border-b border-[var(--border-default)] px-5 py-5 sm:px-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-base)]">
                        Radar preview
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-[var(--border-default)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                        <LockKeyhole aria-hidden="true" className="size-3" />
                        Unmeasured fields stay locked
                    </span>
                </div>
                <h2 id="radar-preview-heading" className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
                    What this receipt becomes after repeated measurement
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    The first Gemini answer below is real. Everything marked unmeasured is a preview of Radar&apos;s structure, not generated data.
                </p>
            </div>

            <div className="grid gap-px bg-[var(--border-default)] lg:grid-cols-[1.15fr_.85fr]">
                <div className="bg-[var(--bg-base)] p-5 sm:p-6">
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Sample rail</p>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">Four independent answers per engine</p>
                        </div>
                        <p className="font-mono text-xs text-[var(--text-tertiary)]">{completed ? "1 / 4 observed" : "0 / 4 observed"}</p>
                    </div>

                    <ol aria-label="Gemini sample coverage" className="space-y-2">
                        {[0, 1, 2, 3].map((index) => {
                            const isReceipt = index === 0 && (completed || failed);
                            const sampleLabel = isReceipt
                                ? completed
                                    ? brandMentioned ? "Mention observed" : "No mention observed"
                                    : "Sample failed"
                                : "Not measured yet";
                            return (
                                <li key={index} className="grid min-h-10 grid-cols-[2rem_1fr_auto] items-center gap-3 border-t border-[var(--border-subtle)] py-2.5 first:border-t-0">
                                    <span className="font-mono text-[10px] text-[var(--text-ghost)]">0{index + 1}</span>
                                    <span className={`text-sm ${isReceipt ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                                        {sampleLabel}
                                    </span>
                                    <span className={`size-2 rounded-full ${
                                        isReceipt
                                            ? completed
                                                ? brandMentioned ? "bg-[var(--data-green)]" : "bg-[var(--data-red)]"
                                                : "bg-[var(--data-amber)]"
                                            : "border border-[var(--border-active)]"
                                    }`} />
                                </li>
                            );
                        })}
                    </ol>

                    <div className="mt-5 border-l-2 border-[var(--border-active)] pl-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Confidence</p>
                        <p className="mt-1 text-sm text-[var(--text-primary)]">Unavailable from one answer</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--text-tertiary)]">Aelo waits for repeated, compatible samples instead of inventing a range.</p>
                    </div>
                </div>

                <div className="bg-[var(--bg-surface)] p-5 sm:p-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Engine coverage</p>
                    <div className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                        {ENGINES.map((engine) => {
                            const isGemini = engine === "Gemini";
                            return (
                                <div key={engine} className="flex min-h-10 items-center justify-between gap-4 py-2.5 text-sm">
                                    <span className={isGemini ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>{engine}</span>
                                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                                        {isGemini && completed ? "1 real sample" : isGemini && failed ? "Failed" : "Not measured"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid border-t border-[var(--border-default)] md:grid-cols-2">
                <div className="border-b border-[var(--border-default)] p-5 sm:p-6 md:border-b-0 md:border-r">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Source ledger</p>
                    {safeSources.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {safeSources.slice(0, 3).map((source) => (
                                <a
                                    key={source.url}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex min-h-10 items-center justify-between gap-3 border-t border-[var(--border-subtle)] py-2 text-sm text-[var(--text-secondary)] first:border-t-0 hover:text-[var(--text-primary)]"
                                >
                                    <span className="truncate">{source.title || sourceHost(source.url)}</span>
                                    <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                                </a>
                            ))}
                            <p className="pt-1 text-xs leading-relaxed text-[var(--text-tertiary)]">
                                {safeSources.length} provider {safeSources.length === 1 ? "source" : "sources"} in this answer. Recurrence is not known yet.
                            </p>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                            No structured provider citation was returned in this answer. Source recurrence is unmeasured.
                        </p>
                    )}
                </div>

                <div className="p-5 sm:p-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Next defensible action</p>
                    <p className="mt-3 text-base leading-relaxed text-[var(--text-primary)]">{nextStep}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-tertiary)]">
                        Question: {prompt}
                    </p>
                    <Link
                        href={`/signup?brand=${encodeURIComponent(brandName)}`}
                        className="mt-5 inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-[var(--accent-base)]/40 px-3 py-2 text-sm font-medium text-[var(--accent-base)] transition-colors hover:bg-[var(--accent-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-base)]"
                    >
                        Build the full evidence set <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
