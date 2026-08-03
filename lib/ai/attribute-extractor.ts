import { getOpenAIClient } from './openai-client';

// Given an LLM scan's raw response, extract the attributes (short noun
// phrases) that the model associates with the brand and each competitor.
//
// Output shape:
//   [{ entity_name: "Notion",      entity_type: "brand",      attribute: "collaboration", confidence: 0.9 },
//    { entity_name: "Confluence",  entity_type: "competitor", attribute: "enterprise",    confidence: 0.85 }, …]
//
// Design choices:
// - We prompt for a strict JSON array so we can parse deterministically.
// - Attributes are lowercased single-concept noun phrases (max 3 words),
//   so aggregation actually clusters ("enterprise", "enterprise-grade" collapse).
// - We only emit attributes explicitly grounded in the source text. No
//   inference, no world knowledge, the whole point of Aelo is honest measurement.

export type ExtractedAttribute = {
    entity_name: string;
    entity_type: 'brand' | 'competitor';
    attribute:   string;
    confidence:  number;
};

export async function extractAttributes(params: {
    response: string;
    brandName: string;
    competitors: string[];
}): Promise<ExtractedAttribute[]> {
    const { response, brandName, competitors } = params;
    if (!response || !response.trim()) return [];

    const { client, model } = getOpenAIClient('default');
    const isReasoning = /^gpt-5|^o[0-9]/.test(model);

    const systemPrompt = `You extract positioning attributes from LLM responses.
Given a response text, identify which short noun-phrase attributes the response
associates with each named brand or competitor.

RULES:
- Only extract attributes that are EXPLICITLY grounded in the source text (paraphrase is fine, invention is not).
- Attributes: lowercase, 1-3 words, single concept. Examples: "enterprise", "local-first", "budget-friendly", "collaboration", "developer-focused", "reliable support".
- Collapse synonyms into their canonical short form ("enterprise-grade" → "enterprise").
- Skip empty adjectives with no positioning meaning ("good", "great", "nice").
- entity_type is "brand" if the entity is the tracked brand, "competitor" otherwise.
- Confidence 0..1: how directly the attribute is stated (1 = literal, 0.5 = strongly implied).
- Return ONLY a JSON array, no prose, no code fences.`;

    const userPrompt = `Tracked brand: ${brandName}
Tracked competitors: ${competitors.join(', ') || '(none)'}

Response text:
"""
${response.slice(0, 8000)}
"""

Return the JSON array now.`;

    const paramsObj: Record<string, unknown> = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
        ],
        response_format: { type: 'json_object' },
    };
    if (isReasoning) {
        paramsObj.max_completion_tokens = 4000;
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
        console.warn('[extractAttributes] LLM call failed:', err);
        return [];
    }

    return parseAttributeJSON(raw, brandName, competitors);
}

function parseAttributeJSON(raw: string, brandName: string, competitors: string[]): ExtractedAttribute[] {
    if (!raw) return [];

    // json_object mode returns an object; some models still emit a bare array
    // wrapped in a top-level field. Try both.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    let parsed: unknown;
    try { parsed = JSON.parse(cleaned); }
    catch { return []; }

    const list: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { attributes?: unknown }).attributes)
            ? (parsed as { attributes: unknown[] }).attributes
            : Array.isArray((parsed as { results?: unknown }).results)
                ? (parsed as { results: unknown[] }).results
                : [];

    const validCompetitorsLower = new Set(competitors.map(c => c.toLowerCase()));
    const brandLower = brandName.toLowerCase();

    const out: ExtractedAttribute[] = [];
    for (const raw of list) {
        if (typeof raw !== 'object' || !raw) continue;
        const r = raw as Record<string, unknown>;
        const entity_name = typeof r.entity_name === 'string' ? r.entity_name.trim() : '';
        const attribute   = typeof r.attribute   === 'string' ? r.attribute.trim().toLowerCase() : '';
        if (!entity_name || !attribute) continue;
        if (attribute.length > 40 || attribute.split(/\s+/).length > 3) continue;

        const nameLower = entity_name.toLowerCase();
        const entity_type: 'brand' | 'competitor' =
            nameLower === brandLower ? 'brand'
            : validCompetitorsLower.has(nameLower) ? 'competitor'
            : (r.entity_type === 'brand' ? 'brand' : 'competitor');

        const confidence = typeof r.confidence === 'number'
            ? Math.max(0, Math.min(1, r.confidence))
            : 0.7;

        out.push({ entity_name, entity_type, attribute, confidence });
    }
    return out;
}
