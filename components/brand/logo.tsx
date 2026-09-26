import { cn } from '@/lib/utils';

// The approved core mockup uses a lowercase wordmark with a small rising
// reference arrow. Keep the compact mark and browser icon in that same family.
const SANS = 'var(--font-sans), "Helvetica Neue", Arial, sans-serif';
const A_PATH = 'M444.7 -30Q325.3 -30 244 14.3Q162.7 58.7 121.3 132.3Q80 206 80 294Q80 375.7 109.2 437.8Q138.3 500 195 543.7Q251.7 587.3 335.3 614Q406.7 635 497.8 651.2Q589 667.3 689.3 681Q789.7 694.7 888.7 709.3L813.3 666.7Q815 794.3 759.5 855.5Q704 916.7 569.3 916.7Q484 916.7 413.2 877.2Q342.3 837.7 314 746.7L119.3 806.7Q158.7 946 271.2 1028Q383.7 1110 570.7 1110Q716 1110 823.3 1060.3Q930.7 1010.7 980.7 904Q1006.7 850.7 1012.7 791.7Q1018.7 732.7 1018.7 665.3V0H834V246.7L870 215.3Q803 91.3 699.3 30.7Q595.7 -30 444.7 -30ZM482 140.7Q571 140.7 635.2 172.3Q699.3 204 738.2 253.2Q777 302.3 789.3 354.7Q806 402.7 808.3 463Q810.7 523.3 810.7 558.7L878.7 534Q780.3 519 699.2 507.2Q618 495.3 552.7 483.5Q487.3 471.7 436 456Q393 441.3 359.3 420.3Q325.7 399.3 306.2 369Q286.7 338.7 286.7 296Q286.7 254 307.7 218.7Q328.7 183.3 371.8 162Q415 140.7 482 140.7Z';

type MarkProps = {
    size?: number;
    className?: string;
    /** Render the arrow in the current text color. */
    monochrome?: boolean;
};

export function AeloMark({ size = 24, className, monochrome = false }: MarkProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('shrink-0', className)}
            aria-hidden="true"
        >
            <g transform="translate(10 84) scale(.053 -.053)" fill="currentColor">
                <path d={A_PATH} />
            </g>
            <path
                d="M62 18H84V40M84 18 60 42"
                stroke={monochrome ? 'currentColor' : 'var(--accent-base, #A8CBE0)'}
                strokeWidth="5.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
            />
        </svg>
    );
}

type WordmarkProps = {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const WORDMARK_SIZE = { sm: 18, md: 24, lg: 32 } as const;

export function AeloWordmark({ size = 'md', className }: WordmarkProps) {
    return (
        <span
            className={cn('inline-flex shrink-0 items-start whitespace-nowrap text-[var(--text-primary)]', className)}
            role="img"
            aria-label="aelo"
            style={{ fontFamily: SANS, fontSize: WORDMARK_SIZE[size], fontWeight: 600, letterSpacing: '-0.08em', lineHeight: 1 }}
        >
            aelo
            <span aria-hidden="true" className="ml-[0.14em] mt-[0.08em] text-[0.48em] tracking-normal text-[var(--accent-base)]">↗</span>
        </span>
    );
}
