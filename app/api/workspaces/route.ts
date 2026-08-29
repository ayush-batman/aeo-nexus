import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';

export const maxDuration = 60; // Extend Vercel timeout for initial LLMs scale

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
        const profile = { org_id: context.orgId };
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

        // Enforce the server-owned plan limit before using the service role.
        const { count } = await db
            .from('workspaces')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', profile.org_id);

        if (entitlements.brands !== null && (count || 0) >= entitlements.brands) {
            return NextResponse.json({ error: `This plan allows ${entitlements.brands} brand workspace(s)` }, { status: 403 });
        }

        const { data: workspace, error } = await db
            .from('workspaces')
            .insert({
                org_id: profile.org_id,
                name,
                settings: {
                    website: website || null,
                    competitors,
                },
            })
            .select('id, name, settings, created_at')
            .single();

        if (error) {
            console.error('Error creating workspace:', error);
            return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
        }

        // Run an automatic initial background scan to populate the dashboard!
        try {
            const { scanLLM } = await import('@/lib/ai/llm-scanner');
            const available = getAvailablePlatforms().filter((item) => item.available).map((item) => item.platform);
            const platforms = available.filter((platform) => entitlements.engines.includes(platform)) as LLMPlatform[];
            const reservation = platforms.length > 0 ? await reserveScanQuota(
                context.orgId,
                `workspace:${workspace.id}:initial`,
                db,
            ) : 'denied';
            const { results } = reservation === 'reserved' ? await scanLLM({
                prompt: `What is ${name}?`,
                brandName: name,
                brandDomain: website || undefined,
                competitors,
                platforms,
            }) : { results: [] };

            if (results && results.length > 0) {
                const scanInserts = results.map(r => ({
                    workspace_id: workspace.id,
                    platform: r.platform,
                    prompt: r.prompt,
                    response: r.response,
                    brand_mentioned: r.brandMentioned,
                    brand_variants: r.brandVariants,
                    mention_position: r.mentionPosition,
                    sentiment: r.sentiment,
                    sentiment_score: r.sentimentScore,
                    sentiment_reason: r.sentimentReason,
                    competitors_mentioned: r.competitorsMentioned,
                    citations: r.citations,
                    list_items: r.listItems,
                    confidence: r.confidence,
                }));
                if (scanInserts.length > 0) {
                    await db.from('llm_scans').insert(scanInserts);
                }
            }
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
