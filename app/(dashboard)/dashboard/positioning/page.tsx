import { redirect } from 'next/navigation';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { loadPositioningMatrix, type PositioningMatrix } from '@/lib/analytics/positioning';
import { Header } from '@/components/dashboard/header';
import { PositioningView } from '@/components/dashboard/positioning-view';

export const dynamic = 'force-dynamic';

type SerializedMatrix = {
    entities:   PositioningMatrix['entities'];
    attributes: PositioningMatrix['attributes'];
    cells:      Array<[string, PositioningMatrix['cells'] extends Map<string, infer V> ? V : never]>;
    lastUpdated: string | null;
};

export default async function PositioningPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    let matrix: PositioningMatrix = { entities: [], attributes: [], cells: new Map(), lastUpdated: null };
    let missingTable = false;
    try {
        matrix = await loadPositioningMatrix(ctx.workspaceId);
    } catch (err) {
        console.warn('[positioning] matrix load failed (migration 021 not applied?):', err);
        missingTable = true;
    }

    const serialized: SerializedMatrix = {
        entities:   matrix.entities,
        attributes: matrix.attributes,
        cells:      Array.from(matrix.cells.entries()),
        lastUpdated: matrix.lastUpdated,
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                title="Competitor Positioning"
                description="What each AI actually says about you vs your competitors. Rows are entities, columns are attributes, cell darkness shows how often the LLM associates the two."
            />
            <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
                <PositioningView data={serialized} missingTable={missingTable} />
            </main>
        </div>
    );
}
