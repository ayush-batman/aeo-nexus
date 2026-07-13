import { getOpenAIClient } from './openai-client';

// Given an LLM scan response, extract the discrete factual claims it makes
// about the tracked brand. A "claim" is a checkable statement — a price, a
// feature, a founding year, a comparison, a customer count. Fluff, adjectives,
// and hedging get dropped.
//
// Output shape:
//   [{ claim_text: "Notion offers a free tier for up to 10 users" }, …]

export type ExtractedClaim = { claim_text: string };

export async function extractClaims(params: {
    response: string;
    brandName: string;
}): Promise<ExtractedClaim[]> {
    const { response, brandName } = params;
    if (!response?.trim()) return [];

    const { client, model } = getOpenAIClient('default');
    const isReasoning = /^gpt-5|^o[0-9]/.test(model);

    const systemPrompt = `You extract checkable factual claims about a specific brand from LLM responses.

A CLAIM is a statement that could be verified against reality (a fact about the brand's
pricing, features, founding year, customer count, integrations, ownership, comparisons,
statistics, etc.). Reject subjective adjectives, hedged language, and generic filler.

RULES:
- Extract only claims made about the TRACKED BRAND (not competitors).
- Each claim is a single sentence, 6-25 words, self-contained (no pronouns to unresolved antecedents).
- Rewrite lightly if needed for clarity, but preserve the substance.
- Skip fluff ("Notion is great for teams", "everyone loves Notion").
- Skip world-knowledge non-claims ("Notion is a software product").
- If no verifiable claims exist, return an empty array.
- Return ONLY JSON: { "claims": [{"claim_text": "..."}, ...] }`;

    const userPrompt = `Tracked brand: ${brandName}

Response text:
"""
${response.slice(0, 8000)}
"""`;

    const paramsObj: Record<string, unknown> = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
        ],
        response_format: { type: 'json_object' },
    };
    if (isReasoning) {
        paramsObj.max_completion_tokens = 3000;
        paramsObj.reasoning_effort = 'minimal';
    } else {
        paramsObj.max_tokens = 1024;
    }

    let raw: string;
    try {
        const completion = await client.chat.completions.create(
            paramsObj as unknown as Parameters<typeof client.chat.completions.create>[0] & { stream?: false }
        );
        raw = completion.choices[0]?.message?.content ?? '';
    } catch (err) {
        console.warn('[extractClaims] LLM call failed:', err);
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        const arr: unknown[] = Array.isArray(parsed?.claims) ? parsed.claims : [];
        return arr
            .map(c => (typeof c === 'object' && c && typeof (c as { claim_text?: unknown }).claim_text === 'string'
                ? { claim_text: (c as { claim_text: string }).claim_text.trim() }
                : null))
            .filter((c): c is ExtractedClaim => !!c && c.claim_text.length > 0 && c.claim_text.length < 300);
    } catch {
        return [];
    }
}
