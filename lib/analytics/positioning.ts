import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import type { FunctionReturnType } from 'convex/server';

export type MatrixCell = {
    entity_name: string;
    entity_type: 'brand' | 'competitor';
    attribute:   string;
    frequency:   number;
    avg_confidence: number | null;
    platforms:   string[];
};

export type PositioningMatrix = {
    entities:   { name: string; type: 'brand' | 'competitor'; total: number }[];
    attributes: { attribute: string; totalFrequency: number }[];
    cells:      Map<string, MatrixCell>; // key: `${entity}|${attribute}`
    lastUpdated: string | null;
};

export async function loadPositioningMatrix(workspaceId: string): Promise<PositioningMatrix> {
    const data: FunctionReturnType<typeof api.analysis.attributes>['page'] = [];
    let cursor: string | null = null;
    do {
        const result: FunctionReturnType<typeof api.analysis.attributes> = await fetchAuthQuery(api.analysis.attributes, { workspaceId, paginationOpts: { cursor, numItems: 100 } });
        data.push(...result.page);
        cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);
    if (!data.length) return { entities: [], attributes: [], cells: new Map(), lastUpdated: null };

    const cellMap = new Map<string, MatrixCell & { confSum: number; confCount: number; platformSet: Set<string> }>();
    const entityTotals   = new Map<string, { type: 'brand' | 'competitor'; total: number }>();
    const attributeTotals = new Map<string, number>();

    for (const r of data) {
        const key = `${r.entity_name}|${r.attribute}`;
        const existing = cellMap.get(key);
        if (existing) {
            existing.frequency += 1;
            if (r.confidence != null) { existing.confSum += r.confidence; existing.confCount++; }
            existing.platformSet.add(r.platform);
        } else {
            cellMap.set(key, {
                entity_name: r.entity_name,
                entity_type: r.entity_type as 'brand' | 'competitor',
                attribute:   r.attribute,
                frequency:   1,
                confSum: r.confidence ?? 0,
                confCount: r.confidence == null ? 0 : 1,
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
            avg_confidence: v.confCount ? v.confSum / v.confCount : null,
            platforms:   Array.from(v.platformSet).sort(),
        });
    }

    const entities = Array.from(entityTotals.entries())
        .map(([name, v]) => ({ name, type: v.type, total: v.total }))
        // Brand first, competitors after, ranked by total citations.
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
