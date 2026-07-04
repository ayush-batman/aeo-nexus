import { cn } from '@/lib/utils';

/**
 * Aelo — Brand Marks
 *
 * ARCHETYPE: Sage + Magician (see BRAND_ARCHETYPE.md).
 *
 * The mark is an *aperture-prism*: an apex triangle (Sage — standard,
 * measurement, apex) intersected by a thin horizontal "answer line" (the
 * revealed truth — the moment the AI's opaque response becomes legible).
 *
 * At small sizes it reads as a clean apex glyph. On hover / at large scale
 * the horizontal beam becomes the story.
 *
 * DO NOT change color inline. The mark inherits `currentColor` for the
 * silhouette so it always sits correctly on any surface, and uses the
 * `--accent-base` CSS variable for the answer line (Magician moment).
 */

type MarkProps = {
    size?: number;
    className?: string;
    /** hide the accent-color answer line (e.g. all-white favicon) */
    monochrome?: boolean;
};

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
            {/* Outer apex — the measurement instrument (Sage). Thin stroke reads
                more "instrument" than "logo blob". Rounded joins keep it precise
                without feeling brittle at small sizes. */}
            <path
                d="M12 2.75 L21.5 20.75 L2.5 20.75 Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Answer line — the revealed truth (Magician).
                Sits at ~65% height, spans the interior width at that y. */}
            {!monochrome && (
                <line
                    x1="6.65"
                    y1="15.75"
                    x2="17.35"
                    y2="15.75"
                    stroke="var(--accent-base, #E5D3A6)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            )}
            {monochrome && (
                <line
                    x1="6.65"
                    y1="15.75"
                    x2="17.35"
                    y2="15.75"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}

/**
 * Wordmark: mark + "aelo" lowercase.
 * Lowercase is Sage territory (Google, Palantir, Stripe) — feels like a proper
 * noun spoken by someone who knows what it is, not shouted from a billboard.
 */
type WordmarkProps = {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const WORDMARK_SIZES = {
    sm: { icon: 18, text: 'text-[14px]', gap: 'gap-1.5' },
    md: { icon: 22, text: 'text-[15px]', gap: 'gap-2' },
    lg: { icon: 28, text: 'text-[18px]', gap: 'gap-2.5' },
} as const;

export function AeloWordmark({ size = 'md', className }: WordmarkProps) {
    const s = WORDMARK_SIZES[size];
    return (
        <span
            className={cn(
                'inline-flex items-center text-[var(--text-primary)]',
                s.gap,
                className,
            )}
        >
            <AeloMark size={s.icon} />
            <span
                className={cn(
                    s.text,
                    'font-medium tracking-[-0.015em] leading-none',
                )}
                style={{ fontFeatureSettings: '"ss01" 1' }}
            >
                aelo
            </span>
        </span>
    );
}
