import { cn } from '@/lib/utils';

/**
 * Aelo, Brand Marks
 *
 * ARCHETYPE: Sage + Magician (see BRAND_ARCHETYPE.md).
 *
 * The name is AEO + halo → aelo. The mark draws it literally: the letter
 * "a" wearing a halo, a ring of light. The halo is the glow a brand casts
 * inside AI answers: invisible, but measurable. One shape carries the whole
 * story, so the name and the mark say the same thing.
 *
 * The "a" inherits `currentColor` so it sits on any surface. The halo uses
 * the `--accent-base` (beacon-ivory) variable, the Magician accent, unless
 * `monochrome` is set (e.g. all-white favicon).
 */

type MarkProps = {
    size?: number;
    className?: string;
    /** render the halo in currentColor instead of the ivory accent */
    monochrome?: boolean;
};

const SANS = 'var(--font-sans), "Helvetica Neue", Arial, sans-serif';

export function AeloMark({ size = 24, className, monochrome = false }: MarkProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('shrink-0', className)}
            aria-hidden="true"
        >
            {/* Halo, the ring of light (Magician moment). Tilted ~8° so it
                reads as a halo in perspective, not a flat ring. */}
            <ellipse
                cx="12"
                cy="4.6"
                rx="6.6"
                ry="1.9"
                fill="none"
                stroke={monochrome ? 'currentColor' : 'var(--accent-base, #E5D3A6)'}
                strokeWidth="0.85"
                transform="rotate(-8 12 4.6)"
            />
            {/* The letter, the name, drawn (Sage). Inherits currentColor and
                the app's sans so it matches the wordmark. */}
            <text
                x="12"
                y="20.4"
                textAnchor="middle"
                fontSize="17.2"
                fontWeight={600}
                fill="currentColor"
                style={{ fontFamily: SANS }}
            >
                a
            </text>
        </svg>
    );
}

/**
 * Wordmark: "aelo" with the halo over its own first "a". Lowercase is Sage
 * territory (Stripe, Palantir), a proper noun spoken by someone who knows
 * what it is, not shouted from a billboard. Self-contained SVG so it renders
 * identically everywhere and never needs a second, redundant icon beside it.
 */
type WordmarkProps = {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

// display height (px) of the wordmark
const WORDMARK_H = { sm: 18, md: 24, lg: 32 } as const;

export function AeloWordmark({ size = 'md', className }: WordmarkProps) {
    const h = WORDMARK_H[size];
    return (
        <svg
            height={h}
            viewBox="0 0 220 130"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('shrink-0 text-[var(--text-primary)]', className)}
            role="img"
            aria-label="aelo"
        >
            <text
                x="6"
                y="104"
                fontSize="96"
                fontWeight={600}
                letterSpacing="-4"
                fill="currentColor"
                style={{ fontFamily: SANS }}
            >
                aelo
            </text>
            <ellipse
                cx="34"
                cy="16"
                rx="28"
                ry="8"
                fill="none"
                stroke="var(--accent-base, #E5D3A6)"
                strokeWidth="3.4"
                transform="rotate(-8 34 16)"
            />
        </svg>
    );
}
