import { getOpenAIClient } from './openai-client';
import type { ExtractedClaim } from './claim-extractor';

// Fact-check each extracted claim against the brand's own website.
// Fetches the site (best-effort — one-page GET, no crawl) and feeds
// it as ground-truth context to gpt-5 with strict verdict rubric.
//
// Verdicts:
//   'true'        — site directly supports the claim
//   'false'       — site directly contradicts the claim
//   'outdated'    — site shows this used to be true but no longer is
//   'unverified'  — site does not contain enough signal either way

export type VerifiedClaim = ExtractedClaim & {
    verdict:     'true' | 'false' | 'outdated' | 'unverified';
    confidence:  number;
    evidence_url:     string | null;
    evidence_snippet: string | null;
    reasoning:   string;
};

export async function verifyClaims(params: {
    claims:    ExtractedClaim[];
    brandName: string;
    website:   string | null;
}): Promise<VerifiedClaim[]> {
    if (!params.claims.length) return [];

    const sourceText = params.website ? await fetchSourceText(params.website) : null;
    const evidenceUrl = params.website ?? null;

    if (!sourceText) {
        // No ground truth available — mark all unverified, cheap short-circuit.
        return params.claims.map(c => ({
            ...c,
            verdict:   'unverified' as const,
            confidence: 0,
            evidence_url:     null,
            evidence_snippet: null,
            reasoning: params.website
                ? 'Could not fetch the brand website; verification skipped.'
                : 'No brand website configured; add one in Settings to verify claims.',
        }));
    }

    // Batch the whole set into one LLM call — reasoning models handle multi-claim
    // rubrics well and it's one round-trip. Fall back to unverified on any error.
    const { client, model } = getOpenAIClient('premium');
    const isReasoning = /^gpt-5|^o[0-9]/.test(model);

    const systemPrompt = `You verify factual claims against a source text.
Each claim gets one of four verdicts:
- "true"       — the source directly supports the claim.
- "false"      — the source directly contradicts the claim.
- "outdated"   — the source shows the claim WAS true but no longer is (dated wording, "previously", explicit deprecation).
- "unverified" — the source doesn't contain enough signal either way.

For each claim also return:
- confidence (0..1)
- evidence_snippet: ≤400 chars of the source that grounded the verdict (or null if unverified)
- reasoning: one sentence explaining the verdict.

Return ONLY JSON: { "verdicts": [{ "claim_text": "...", "verdict": "...", "confidence": 0..1, "evidence_snippet": "...", "reasoning": "..." }, ...] }
Include one entry per input claim, in the same order.`;

    const userPrompt = `Brand: ${params.brandName}
Source URL: ${params.website}

Source text (ground truth):
"""
${sourceText.slice(0, 12000)}
"""

Claims to verify:
${params.claims.map((c, i) => `${i + 1}. ${c.claim_text}`).join('\n')}`;

    const paramsObj: Record<string, unknown> = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
        ],
        response_format: { type: 'json_object' },
    };
    if (isReasoning) {
        paramsObj.max_completion_tokens = 6000;
        paramsObj.reasoning_effort = 'low';
    } else {
        paramsObj.max_tokens = 2048;
    }

    let raw: string;
    try {
        const completion = await client.chat.completions.create(
            paramsObj as unknown as Parameters<typeof client.chat.completions.create>[0] & { stream?: false }
        );
        raw = completion.choices[0]?.message?.content ?? '';
    } catch (err) {
        console.warn('[verifyClaims] LLM call failed:', err);
        return params.claims.map(c => ({
            ...c,
            verdict:    'unverified' as const,
            confidence: 0,
            evidence_url:     null,
            evidence_snippet: null,
            reasoning:  'Verifier call failed.',
        }));
    }

    let parsed: { verdicts?: unknown[] };
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const verdicts: unknown[] = Array.isArray(parsed.verdicts) ? parsed.verdicts : [];

    return params.claims.map((c, i) => {
        const v = verdicts[i] as Record<string, unknown> | undefined;
        const verdict = normalizeVerdict(typeof v?.verdict === 'string' ? v.verdict : 'unverified');
        return {
            ...c,
            verdict,
            confidence: typeof v?.confidence === 'number' ? Math.max(0, Math.min(1, v.confidence)) : 0.5,
            evidence_url:     verdict === 'unverified' ? null : evidenceUrl,
            evidence_snippet: typeof v?.evidence_snippet === 'string' ? v.evidence_snippet.slice(0, 400) : null,
            reasoning:        typeof v?.reasoning === 'string' ? v.reasoning : 'No reasoning returned.',
        };
    });
}

function normalizeVerdict(v: string): VerifiedClaim['verdict'] {
    const low = v.toLowerCase();
    if (low === 'true' || low === 'false' || low === 'outdated' || low === 'unverified') return low;
    return 'unverified';
}

async function fetchSourceText(url: string): Promise<string | null> {
    try {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        const res = await fetch(normalized, {
            headers: { 'User-Agent': 'Aelo-AccuracyBot/1.0 (+https://aelo.sh)' },
            signal:  AbortSignal.timeout(10_000),
        });
        if (!res.ok) return null;
        const html = await res.text();
        // Strip tags for a rough plain-text pass. Not perfect but cheap.
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    } catch (err) {
        console.warn('[verifyClaims] fetch failed:', err);
        return null;
    }
}
