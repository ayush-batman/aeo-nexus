import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import { scanResultPersistenceRow } from '@/lib/measurement/persistence';

export const maxDuration = 300;

// GET: List all workspaces for the current user's org
export async function GET() {
    try {
        // Route through the shared context helper so the dev-auth-bypass
        // works here too (workspaces was previously calling auth.getUser()
        // directly and returning 401 for bypass users).
        const context = await getCurrentWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = createAdminClient();

        const { data: workspaces } = await db
            .from('workspaces')
            .select('id, name, settings, created_at')
            .eq('org_id', context.orgId)
            .order('created_at', { ascending: true });

        return NextResponse.json({ workspaces: workspaces || [] });
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}

// POST: Create a new workspace (brand)
export async function POST(request: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!requireWorkspaceRole(context, ['owner', 'admin'])) {
            return NextResponse.json({ error: 'Owner or admin role required' }, { status: 403 });
        }

        const db = createAdminClient();
        const entitlements = await getEntitlements(context.orgId, db);

        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 100) : '';
        const website = typeof body?.website === 'string' ? body.website.trim().slice(0, 2048) : '';
        const competitors = Array.isArray(body?.competitors)
            ? body.competitors
                .filter((value): value is string => typeof value === 'string')
                .map((value) => value.trim().slice(0, 100))
                .filter(Boolean)
                .slice(0, 20)
            : [];

        if (!name) {
            return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
        }

        const { data, error } = await db.rpc('create_workspace_with_plan_limit', {
            p_org_id: context.orgId,
            p_name: name,
            p_settings: { website: website || null, competitors },
        });
        const result = data as {
            status?: 'created' | 'denied' | 'organization_not_found';
            limit?: number;
            workspace?: { id: string; name: string; settings: Record<string, unknown>; created_at: string };
        } | null;
        if (result?.status === 'denied') {
            return NextResponse.json({ error: `This plan allows ${result.limit} brand workspace(s)` }, { status: 403 });
        }
        const workspace = result?.workspace;
        if (error || !workspace) {
            console.error('Error creating workspace:', error);
            return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
        }

        // Run an automatic initial background scan to populate the dashboard!
        try {
            const available = getAvailablePlatforms().filter((item) => item.available).map((item) => item.platform);
            const platforms = available.filter((platform) => entitlements.engines.includes(platform)) as LLMPlatform[];
            const reservation = platforms.length > 0 ? await reserveScanQuota(
                context.orgId,
                `workspace:${workspace.id}:initial`,
                db,
            ) : 'denied';
            if (reservation === 'reserved') await runVisibilityMeasurement({
                prompt: `What is ${name}?`,
                brandName: name,
                brandDomain: website || undefined,
                competitors,
                platforms,
                samples: 4,
            }, {
                persist: async (results) => {
                    const { error: insertError } = await db.from('llm_scans').insert(
                        results.map(result => scanResultPersistenceRow(workspace.id, result)),
                    );
                    if (insertError) throw new Error(`Could not save initial measurement: ${insertError.message}`);
                },
            });
        } catch (scanError) {
            console.error('Initial background scan failed:', scanError);
            // We do not fail the workspace creation if the scan fails
        }

        return NextResponse.json({ workspace });
    } catch (error) {
        console.error('Error creating workspace:', error);
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }
}
