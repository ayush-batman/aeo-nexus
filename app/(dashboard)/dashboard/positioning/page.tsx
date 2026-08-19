import { redirect } from 'next/navigation';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getEntitlements } from '@/lib/entitlements';
import { loadPositioningMatrix, type PositioningMatrix } from '@/lib/analytics/positioning';
import { Header } from '@/components/dashboard/header';
import { PositioningView } from '@/components/dashboard/positioning-view';
import { LockedPreview } from '@/components/billing/locked-preview';

export const dynamic = 'force-dynamic';

type SerializedMatrix = {
    entities:   PositioningMatrix['entities'];
    attributes: PositioningMatrix['attributes'];
    cells:      Array<[string, PositioningMatrix['cells'] extends Map<string, infer V> ? V : never]>;
    lastUpdated: string | null;
};

// Illustrative sample shown blurred behind the upgrade card (not real data).
function SamplePositioningTeaser() {
    const attrs = ['Quality', 'Price', 'Support', 'Enterprise', 'Ease of use'];
    const rows = [
        { label: 'You', name: 'Your brand', cells: [14, 3, 9, 2, 11] },
        { label: 'Competitor', name: 'Rival One', cells: [4, 12, 3, 9, 2] },
        { label: 'Competitor', name: 'Rival Two', cells: [8, 2, 6, 3, 7] },
        { label: 'Competitor', name: 'Rival Three', cells: [2, 8, 4, 6, 3] },
    ];
    return (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="grid grid-cols-6 px-5 py-3 text-[11px] uppercase tracking-widest text-[var(--text-ghost)] border-b border-[var(--border)]">
                <div className="col-span-1">Entity</div>
                {attrs.map((a) => <div key={a} className="text-center">{a}</div>)}
            </div>
            {rows.map((r) => (
                <div key={r.name} className="grid grid-cols-6 items-center px-5 py-4 border-b border-[var(--border)] last:border-0">
                    <div className="col-span-1">
                        <div className="text-[10px] uppercase tracking-widest text-[var(--text-ghost)]">{r.label}</div>
                        <div className="text-sm text-[var(--text-primary)]">{r.name}</div>
                    </div>
                    {r.cells.map((v, i) => (
                        <div key={i} className="flex justify-center">
                            <div
                                className="h-8 w-10 rounded flex items-center justify-center text-xs text-white"
                                style={{ background: `rgba(229,211,166,${0.12 + (v / 14) * 0.7})` }}
                            >
                                {v || '—'}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default async function PositioningPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx?.workspaceId) redirect('/login');

    // Paid-only feature. Gate before loading any data so free users never see it.
    const ent = await getEntitlements(ctx.orgId);
    if (!ent.paid) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header
                    title="Competitor Positioning"
                    description="What each AI actually says about you vs your competitors."
                />
                <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
                    <LockedPreview
                        feature="Competitor Positioning"
                        blurb="See how every AI frames you against your competitors, attribute by attribute. Available on Starter and above."
                        plan={ent.plan}
                    >
                        <SamplePositioningTeaser />
                    </LockedPreview>
                </main>
            </div>
        );
    }

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
