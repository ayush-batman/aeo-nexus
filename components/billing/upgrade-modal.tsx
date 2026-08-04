"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Lock, ArrowRight, X } from "lucide-react";

/**
 * Shown when a free-tier user hits a server-side 402 plan gate.
 * Sage voice: state the limit plainly, say what unlocks it, do not oversell.
 */
export function UpgradeModal({
    open,
    onClose,
    feature,
    message,
    unlocks,
}: {
    open: boolean;
    onClose: () => void;
    feature: string;
    message?: string;
    unlocks?: string[];
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const bullets = unlocks ?? [
        "All four engines: ChatGPT, Gemini, Claude, Perplexity",
        "Accuracy Verdict: is what the AI says about you true",
        "Sentiment drift and competitor positioning",
        "Higher scan volume",
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`${feature} requires an upgrade`}
        >
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-2xl">
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-4 top-4 text-[var(--text-ghost)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent-base)]/25 bg-[var(--accent-muted)]">
                    <Lock className="h-5 w-5 text-[var(--accent-base)]" />
                </div>

                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {feature} is a paid feature
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {message ?? `Your current plan does not include ${feature}.`}
                </p>

                <ul className="mt-5 space-y-2">
                    {bullets.map((b) => (
                        <li key={b} className="flex gap-2.5 text-sm text-[var(--text-secondary)]">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent-base)]" />
                            <span>{b}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-6 flex items-center gap-3">
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-base)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] transition-opacity hover:opacity-90"
                    >
                        See plans <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                        onClick={onClose}
                        className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Detects a plan gate from a fetch Response + parsed body. */
export function isPlanGate(res: Response, body: unknown): boolean {
    const b = body as { error?: string; upgrade?: boolean } | null;
    return res.status === 402 || b?.upgrade === true || b?.error === "plan_required";
}
