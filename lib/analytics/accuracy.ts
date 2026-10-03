import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import type { FunctionReturnType } from 'convex/server';

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

export async function loadAccuracySummary(workspaceId: string): Promise<AccuracySummary> {
    const rows: AccuracyRow[] = [];
    let cursor: string | null = null;
    do {
        const result: FunctionReturnType<typeof api.analysis.claims> = await fetchAuthQuery(api.analysis.claims, { workspaceId, paginationOpts: { cursor, numItems: 100 } });
        rows.push(...result.page);
        cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);

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
