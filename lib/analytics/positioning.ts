import { createAdminClient } from '@/lib/supabase/admin';
import { extractAttributes } from '@/lib/ai/attribute-extractor';

// Regenerate the competitor_attributes rows for a workspace by scanning
// its most-recent llm_scans and running the extractor over each response.
// Idempotent per (scan_id): we delete rows for the scans we're about to
// re-process, then insert fresh.

const MAX_SCANS = 40; // cap Azure spend per regenerate run

export async function regeneratePositioning(params: {
    workspaceId: string;
    brandName:   string;
    competitors: string[];
}) {
    const db = createAdminClient();
    const { workspaceId, brandName, competitors } = params;

    const { data: scans, error: scanErr } = await db
        .from('llm_scans')
        .select('id, platform, response, brand_mentioned')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(MAX_SCANS);

    if (scanErr) throw new Error(`Scan load failed: ${scanErr.message}`);
    if (!scans?.length) return { processed: 0, attributes: 0 };

    const scanIds = scans.map(s => s.id);
    await db.from('competitor_attributes').delete().in('scan_id', scanIds);

    let attrCount = 0;
    let processed = 0;
    for (const s of scans) {
        if (!s.response) continue;
        const attrs = await extractAttributes({
            response:    s.response as string,
            brandName,
            competitors,
        });
        processed++;
        if (!attrs.length) continue;

        const rows = attrs.map(a => ({
            workspace_id: workspaceId,
            scan_id:      s.id,
            entity_name:  a.entity_name,
            entity_type:  a.entity_type,
            attribute:    a.attribute,
            platform:     s.platform,
            confidence:   a.confidence,
        }));
        const { error: insertErr } = await db.from('competitor_attributes').insert(rows);
        if (insertErr) { console.warn('[positioning] insert failed:', insertErr); continue; }
        attrCount += rows.length;
    }

    return { processed, attributes: attrCount };
}

export type MatrixCell = {
    entity_name: string;
    entity_type: 'brand' | 'competitor';
    attribute:   string;
    frequency:   number;
    avg_confidence: number;
    platforms:   string[];
};

export type PositioningMatrix = {
    entities:   { name: string; type: 'brand' | 'competitor'; total: number }[];
    attributes: { attribute: string; totalFrequency: number }[];
    cells:      Map<string, MatrixCell>; // key: `${entity}|${attribute}`
    lastUpdated: string | null;
};

export async function loadPositioningMatrix(workspaceId: string): Promise<PositioningMatrix> {
    const db = createAdminClient();
    const { data, error } = await db
        .from('competitor_attributes')
        .select('entity_name, entity_type, attribute, platform, confidence, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5000);

    if (error) throw new Error(`Matrix load failed: ${error.message}`);
    if (!data?.length) return { entities: [], attributes: [], cells: new Map(), lastUpdated: null };

    const cellMap = new Map<string, MatrixCell & { confSum: number; platformSet: Set<string> }>();
    const entityTotals   = new Map<string, { type: 'brand' | 'competitor'; total: number }>();
    const attributeTotals = new Map<string, number>();

    for (const r of data) {
        const key = `${r.entity_name}|${r.attribute}`;
        const existing = cellMap.get(key);
        if (existing) {
            existing.frequency += 1;
            existing.confSum   += Number(r.confidence ?? 0.7);
            existing.platformSet.add(r.platform);
        } else {
            cellMap.set(key, {
                entity_name: r.entity_name,
                entity_type: r.entity_type as 'brand' | 'competitor',
                attribute:   r.attribute,
                frequency:   1,
                confSum:     Number(r.confidence ?? 0.7),
                avg_confidence: 0,
                platforms:   [],
                platformSet: new Set([r.platform]),
            });
        }
        const et = entityTotals.get(r.entity_name);
        if (et) et.total += 1;
        else entityTotals.set(r.entity_name, { type: r.entity_type as 'brand' | 'competitor', total: 1 });

        attributeTotals.set(r.attribute, (attributeTotals.get(r.attribute) ?? 0) + 1);
    }

    const cells = new Map<string, MatrixCell>();
    for (const [key, v] of cellMap) {
        cells.set(key, {
            entity_name: v.entity_name,
            entity_type: v.entity_type,
            attribute:   v.attribute,
            frequency:   v.frequency,
            avg_confidence: v.confSum / v.frequency,
            platforms:   Array.from(v.platformSet).sort(),
        });
    }

    const entities = Array.from(entityTotals.entries())
        .map(([name, v]) => ({ name, type: v.type, total: v.total }))
        // Brand first, competitors after — ranked by total citations.
        .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'brand' ? -1 : 1;
            return b.total - a.total;
        });

    const attributes = Array.from(attributeTotals.entries())
        .map(([attribute, totalFrequency]) => ({ attribute, totalFrequency }))
        .sort((a, b) => b.totalFrequency - a.totalFrequency)
        .slice(0, 20); // Top 20 attributes fit on screen; rest hidden behind "See all"

    return { entities, attributes, cells, lastUpdated: data[0]?.created_at ?? null };
}
