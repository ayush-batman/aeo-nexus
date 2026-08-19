import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Semrush/Ahrefs-style locked preview: show a blurred SAMPLE of the feature
 * behind an upgrade card, so free users see there's real value here instead of
 * hitting a blank wall. The children are illustrative sample content only, never
 * the user's real premium data (that stays gated on the server).
 */
export function LockedPreview({
    feature,
    blurb,
    plan,
    children,
}: {
    feature: string;
    blurb: string;
    plan?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* blurred, inert sample */}
            <div
                aria-hidden
                className="pointer-events-none select-none blur-[6px] opacity-50 saturate-50"
            >
                {children}
            </div>

            {/* gradient scrim so the card reads clearly */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)]/40 via-[var(--bg-base)]/70 to-[var(--bg-base)]/90" />

            {/* upgrade card */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="max-w-sm w-full text-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/95 backdrop-blur p-8 shadow-2xl">
                    <div className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--accent-base)]/25 bg-[var(--accent-muted)]">
                        <Lock className="h-5 w-5 text-[var(--accent-base)]" />
                    </div>
                    <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
                        {feature}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                        {blurb}
                        {plan ? (
                            <>
                                {" "}Your current plan:{" "}
                                <span className="text-[var(--text-primary)] font-medium">{plan}</span>.
                            </>
                        ) : null}
                    </p>
                    <Link
                        href="/pricing"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-base)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        Unlock {feature}
                    </Link>
                </div>
            </div>
        </div>
    );
}
