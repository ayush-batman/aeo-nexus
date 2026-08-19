import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Server-rendered upgrade wall for premium feature pages. Matches the
 * Accuracy Verdict free-tier card so gating looks consistent across the
 * product. Render this INSTEAD of the feature (and skip loading its data)
 * when the org is not on a paid plan.
 */
export function PaidFeatureGate({
    feature,
    blurb,
    plan,
}: {
    feature: string;
    blurb: string;
    plan?: string;
}) {
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <Lock className="h-8 w-8 text-[var(--accent-base)] mx-auto mb-4" />
            <div className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {feature} is a paid feature
            </div>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-6">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-base)] text-white text-sm font-medium"
            >
                See plans
            </Link>
        </div>
    );
}
