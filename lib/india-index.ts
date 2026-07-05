// India AI Visibility Index — data + aggregation
//
// Editions are the atomic unit. Each edition = a monthly snapshot of Indian
// brands' AI-answer visibility, aggregated from real llm_scans rows in Aelo.
// Nothing here is fabricated: numbers only appear if there's a scan behind them.

import { createAdminClient } from '@/lib/supabase/admin';

export type IndiaCategory = 'SaaS' | 'D2C' | 'Fintech' | 'EdTech' | 'Consumer';

export interface IndiaBrandEntry {
    rank: number;
    brand: string;
    category: IndiaCategory;
    website: string | null;
    mentionRatePct: number;   // 0–100: fraction of scans where the brand was named
    avgPosition: number | null; // 1 = first named; null if never mentioned
    scanCount: number;
    verdict: 'dominant' | 'strong' | 'contested' | 'invisible';
    sentiment: 'positive' | 'neutral' | 'negative' | null;
}

export interface IndiaEdition {
    slug: string;               // '2026-07'
    label: string;              // 'July 2026'
    publishedAt: string;        // ISO
    isPreview: boolean;
    brandCount: number;
    categoriesTracked: IndiaCategory[];
    entries: IndiaBrandEntry[];
}

// ─── Category assignment (extend as we add more workspaces) ────────────────
const CATEGORY: Record<string, IndiaCategory> = {
    'Zoho':      'SaaS',
    'Razorpay':  'Fintech',
    'Zerodha':   'Fintech',
    'BoAt':      'D2C',
    'Mamaearth': 'D2C',
    "Byju's":    'EdTech',
};

const INDIA_BRAND_NAMES = Object.keys(CATEGORY);

// Verdict rules (Sage: strict thresholds, no smoothing).
function verdictFor(mentionRatePct: number, avgPosition: number | null): IndiaBrandEntry['verdict'] {
    if (mentionRatePct === 0) return 'invisible';
    if (mentionRatePct >= 90 && (avgPosition ?? 99) <= 2) return 'dominant';
    if (mentionRatePct >= 60) return 'strong';
    return 'contested';
}

/**
 * Compose the current July-2026 edition by aggregating llm_scans rows for
 * the India-flagged workspaces. Runs against the admin client (no auth
 * needed — this is public data by design; the Index is a PR asset).
 */
export async function loadCurrentEdition(): Promise<IndiaEdition> {
    const db = createAdminClient();

    const { data: workspaces } = await db
        .from('workspaces')
        .select('id, name, settings')
        .in('name', INDIA_BRAND_NAMES);

    const rows: IndiaBrandEntry[] = [];
    if (workspaces && workspaces.length > 0) {
        for (const w of workspaces) {
            const { data: scans } = await db
                .from('llm_scans')
                .select('brand_mentioned, mention_position, sentiment')
                .eq('workspace_id', w.id);

            const scanCount = scans?.length ?? 0;
            if (scanCount === 0) continue;

            const mentioned = scans!.filter(s => s.brand_mentioned).length;
            const mentionRatePct = Math.round((mentioned / scanCount) * 100);
            const positions = scans!
                .map(s => s.mention_position)
                .filter((p): p is number => typeof p === 'number');
            const avgPosition = positions.length
                ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
                : null;

            // Modal sentiment (Sage: just the most common label)
            const counts = new Map<string, number>();
            for (const s of scans!) if (s.sentiment) counts.set(s.sentiment, (counts.get(s.sentiment) ?? 0) + 1);
            let dominantSentiment: IndiaBrandEntry['sentiment'] = null;
            let best = 0;
            for (const [k, v] of counts) if (v > best) { best = v; dominantSentiment = k as IndiaBrandEntry['sentiment']; }

            rows.push({
                rank: 0, // filled after sort
                brand: w.name,
                category: CATEGORY[w.name] ?? 'Consumer',
                website: (w.settings as { website?: string } | null)?.website ?? null,
                mentionRatePct,
                avgPosition,
                scanCount,
                verdict: verdictFor(mentionRatePct, avgPosition),
                sentiment: dominantSentiment,
            });
        }
    }

    // Rank: mention rate desc, then position asc (lower better)
    rows.sort((a, b) => {
        if (b.mentionRatePct !== a.mentionRatePct) return b.mentionRatePct - a.mentionRatePct;
        return (a.avgPosition ?? 99) - (b.avgPosition ?? 99);
    });
    rows.forEach((r, i) => { r.rank = i + 1; });

    const cats = Array.from(new Set(rows.map(r => r.category))) as IndiaCategory[];

    return {
        slug: '2026-07',
        label: 'July 2026',
        publishedAt: new Date().toISOString(),
        isPreview: true,
        brandCount: rows.length,
        categoriesTracked: cats,
        entries: rows,
    };
}
