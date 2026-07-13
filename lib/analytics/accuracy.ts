import { createAdminClient } from '@/lib/supabase/admin';
import { extractClaims } from '@/lib/ai/claim-extractor';
import { verifyClaims } from '@/lib/ai/claim-verifier';

// Cap Azure spend per verify run — the verifier uses gpt-5 (premium tier).
const MAX_SCANS = 20;

export type AccuracyRow = {
    id: string;
    scan_id: string;
    claim_text: string;
    verdict: 'true' | 'false' | 'outdated' | 'unverified';
    confidence: number | null;
    evidence_url: string | null;
    evidence_snippet: string | null;
    reasoning: string | null;
    created_at: string;
    scan?: { platform: string; prompt: string; created_at: string } | null;
};

export type AccuracySummary = {
    total: number;
    counts: { true: number; false: number; outdated: number; unverified: number };
    accuracyPct: number | null; // trueCount / (true + false + outdated), null if no verdicts
    rows: AccuracyRow[];
    lastUpdated: string | null;
};

export async function regenerateAccuracy(params: {
    workspaceId: string;
    brandName:   string;
    website:     string | null;
}): Promise<{ processed: number; claims: number }> {
    const db = createAdminClient();

    const { data: scans, error } = await db
        .from('llm_scans')
        .select('id, response, brand_mentioned')
        .eq('workspace_id', params.workspaceId)
        .eq('brand_mentioned', true)
        .order('created_at', { ascending: false })
        .limit(MAX_SCANS);

    if (error) throw new Error(`Scan load failed: ${error.message}`);
    if (!scans?.length) return { processed: 0, claims: 0 };

    await db.from('accuracy_claims').delete().in('scan_id', scans.map(s => s.id));

    let claimCount = 0;
    let processed  = 0;
    for (const s of scans) {
        if (!s.response) continue;
        processed++;
        const extracted = await extractClaims({ response: s.response as string, brandName: params.brandName });
        if (!extracted.length) continue;

        const verified = await verifyClaims({
            claims:    extracted,
            brandName: params.brandName,
            website:   params.website,
        });

        const rows = verified.map(v => ({
            workspace_id: params.workspaceId,
            scan_id:      s.id,
            claim_text:   v.claim_text,
            verdict:      v.verdict,
            confidence:   v.confidence,
            evidence_url: v.evidence_url,
            evidence_snippet: v.evidence_snippet,
            reasoning:    v.reasoning,
        }));

        const { error: insertErr } = await db.from('accuracy_claims').insert(rows);
        if (insertErr) { console.warn('[accuracy] insert failed:', insertErr); continue; }
        claimCount += rows.length;
    }

    return { processed, claims: claimCount };
}

export async function loadAccuracySummary(workspaceId: string): Promise<AccuracySummary> {
    const db = createAdminClient();
    const { data, error } = await db
        .from('accuracy_claims')
        .select('id, scan_id, claim_text, verdict, confidence, evidence_url, evidence_snippet, reasoning, created_at, scan:llm_scans(platform, prompt, created_at)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(300);

    if (error) throw new Error(`Accuracy load failed: ${error.message}`);
    const rows = (data ?? []) as unknown as AccuracyRow[];

    const counts = { true: 0, false: 0, outdated: 0, unverified: 0 };
    for (const r of rows) counts[r.verdict]++;
    const denom = counts.true + counts.false + counts.outdated;
    const accuracyPct = denom > 0 ? Math.round((counts.true / denom) * 100) : null;

    return {
        total: rows.length,
        counts,
        accuracyPct,
        rows,
        lastUpdated: rows[0]?.created_at ?? null,
    };
}
