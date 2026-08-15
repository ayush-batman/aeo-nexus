import 'dotenv/config';
import {
    calculateVisibilityScore,
    getAvailablePlatforms,
    scanLLM,
    type ScanResult,
} from '../lib/ai/llm-scanner';

/**
 * Scan-pipeline test net.
 *
 * Aelo's entire proposition is "trust these numbers," yet there was no
 * automated check on the two things that decide whether a number is
 * trustworthy: the scoring math, and the guarantee that a failed scan is
 * reported as failed rather than fabricated. This locks both down.
 *
 * Every test here is network-free and deterministic. The honest-data test
 * works because each provider throws on a missing key BEFORE it makes any
 * request, so clearing the key exercises the failure path without a live call.
 */

let pass = 0;
let fail = 0;
const t = (label: string, cond: boolean, detail = '') =>
    cond
        ? (pass++, console.log(`  OK    ${label}${detail ? '  ' + detail : ''}`))
        : (fail++, console.log(`  FAIL  ${label}${detail ? '  ' + detail : ''}`));

// A fully-specified scan result; individual tests override what they exercise.
const result = (over: Partial<ScanResult> = {}): ScanResult => ({
    platform: 'gemini',
    prompt: 'q',
    response: 'a',
    brandMentioned: false,
    brandVariants: [],
    mentionPosition: null,
    sentiment: 'neutral',
    sentimentScore: 0,
    sentimentReason: '',
    competitorsMentioned: [],
    competitorPositions: [],
    citations: [],
    listItems: [],
    confidence: 1,
    timestamp: '2026-01-01T00:00:00.000Z',
    ...over,
});

async function main() {
    console.log('\n  Visibility score');

    t('no results scores 0, not NaN', calculateVisibilityScore([]) === 0);

    t(
        'an unmentioned brand contributes nothing',
        calculateVisibilityScore([result({ brandMentioned: false })]) === 0,
    );

    // 40 base + 30 position-1 + 20 strong-positive + 10 own-domain = 100.
    const perfect = calculateVisibilityScore([
        result({
            brandMentioned: true,
            mentionPosition: 1,
            sentimentScore: 0.9,
            citations: [{ url: 'https://me.com', title: '', is_own_domain: true }],
            confidence: 1,
        }),
    ]);
    t('best-case single scan maxes at 100', perfect === 100, `got ${perfect}`);

    t(
        'score is capped at 100, never above',
        calculateVisibilityScore([
            result({ brandMentioned: true, mentionPosition: 1, sentimentScore: 1, citations: [{ url: 'https://me.com', title: '', is_own_domain: true }] }),
            result({ brandMentioned: true, mentionPosition: 1, sentimentScore: 1, citations: [{ url: 'https://me.com', title: '', is_own_domain: true }] }),
        ]) <= 100,
    );

    // Two platforms: one strong (100), one absent (0) -> averages to 50.
    const averaged = calculateVisibilityScore([
        result({ brandMentioned: true, mentionPosition: 1, sentimentScore: 0.9, citations: [{ url: 'https://me.com', title: '', is_own_domain: true }] }),
        result({ brandMentioned: false }),
    ]);
    t('score averages across platforms', averaged === 50, `got ${averaged}`);

    t(
        'strong negative sentiment penalises a mention',
        calculateVisibilityScore([result({ brandMentioned: true, sentimentScore: -0.9 })]) <
            calculateVisibilityScore([result({ brandMentioned: true, sentimentScore: 0 })]),
    );

    console.log('\n  Mock guardrail');

    const platforms = getAvailablePlatforms();
    const mock = platforms.find(p => p.platform === 'mock');
    t(
        "'mock' is never reported as an available platform",
        mock !== undefined && mock.available === false,
        'this is what stops fabricated data being auto-selected',
    );

    const claude = platforms.find(p => p.platform === 'claude');
    t(
        'an unconfigured provider is unavailable with a reason',
        !process.env.ANTHROPIC_API_KEY
            ? !!claude && !claude.available && typeof claude.reason === 'string'
            : true,
    );

    console.log('\n  Honest-data policy');

    // Clear the key so the claude path throws at its key check (before any
    // network call) and we exercise the all-failed branch deterministically.
    const savedKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const out = await scanLLM({
        prompt: 'Who are the best CRMs?',
        brandName: 'Acme',
        platforms: ['claude'],
    });

    if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;

    t(
        'a failed provider yields NO results (nothing fabricated)',
        out.results.length === 0,
        `results=${out.results.length}`,
    );
    t(
        'the real failure is surfaced as an error',
        out.errors.length === 1 && out.errors[0].platform === 'claude',
        out.errors.map(e => e.platform).join(',') || 'none',
    );
    t(
        'no result is ever relabelled to a working platform',
        !out.results.some(r => r.platform !== 'mock' && r.platform !== 'claude'),
    );

    console.log(`\n  ${pass} passed, ${fail} failed\n`);
    process.exit(fail ? 1 : 0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
