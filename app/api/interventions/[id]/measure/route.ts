import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAvailablePlatforms, type LLMPlatform, type ScanResult } from '@/lib/ai/llm-scanner';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import { compareVisibilitySnapshots, type ComparableSnapshot } from '@/lib/measurement/comparison';
import { MEASUREMENT_CONTRACT_VERSION } from '@/lib/measurement/types';

export const maxDuration = 300;

function persistenceRow(workspaceId: string, result: ScanResult): Record<string, unknown> {
    return {
        workspace_id: workspaceId,
        platform: result.platform,
        prompt: result.prompt,
        response: result.response,
        brand_mentioned: result.brandMentioned,
        brand_variants: result.brandVariants,
        mention_position: result.mentionPosition,
        sentiment: result.sentiment,
        sentiment_score: result.sentimentScore,
        sentiment_reason: result.sentimentReason,
        competitors_mentioned: result.competitorsMentioned,
        citations: result.citations,
        list_items: result.listItems,
        confidence: result.confidence,
    };
}

// POST /api/interventions/:id/measure
// Runs a fresh scan for each target_prompt on the currently-configured LLM
// providers, computes the delta vs baseline_snapshot, and writes both
// impact_snapshot (the raw numbers) and impact_summary (rolled-up verdict)
// to the intervention row. Also flips status to 'measured'.
//
// This is the receipt. "You did X → visibility went from A to B in N days."
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();

    // 1. Load the intervention (must belong to the caller's workspace)
    const { data: interv, error: loadErr } = await db
        .from('interventions')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', context.workspaceId)
        .single();

    if (loadErr || !interv) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const prompts: string[] = interv.target_prompts ?? [];
    if (prompts.length === 0) {
        return NextResponse.json({ error: 'No target_prompts to measure' }, { status: 400 });
    }

    // 2. Figure out which platforms we can actually call today
    const entitlements = await getEntitlements(context.orgId, db);
    const platforms = getAvailablePlatforms()
        .filter(p => p.available && p.platform !== 'mock')
        .map(p => p.platform)
        .filter(platform => entitlements.engines.includes(platform)) as LLMPlatform[];
    if (platforms.length === 0) {
        return NextResponse.json({ error: 'No entitled LLM providers are configured' }, { status: 503 });
    }

    // One intervention measurement is one user-requested batch, even when it
    // contains several target prompts. The database reservation is atomic.
    const suppliedKey = request.headers.get('idempotency-key')?.trim();
    if (suppliedKey && suppliedKey.length > 100) {
        return NextResponse.json({ error: 'Idempotency-Key must be 100 characters or fewer.' }, { status: 400 });
    }
    const requestKey = suppliedKey || randomUUID();
    const reservation = await reserveScanQuota(context.orgId, `intervention:${id}:${requestKey}`, db);
    if (reservation === 'denied') {
        return NextResponse.json({ error: 'Weekly scan quota exceeded' }, { status: 429 });
    }
    if (reservation === 'duplicate') {
        if (interv.status === 'measured') {
            return NextResponse.json({ intervention: interv, summary: interv.impact_summary, duplicate: true });
        }
        return NextResponse.json({ error: 'This measurement request is already running or did not finish.' }, { status: 409 });
    }

    // Brand name comes off the workspace
    const { data: ws } = await db
        .from('workspaces')
        .select('name, settings')
        .eq('id', context.workspaceId)
        .single();
    const brandName: string = ws?.name ?? 'My Brand';
    const brandDomain: string | undefined = ws?.settings?.website;
    const competitors: string[] = ws?.settings?.competitors ?? [];

    // 3. Measure each prompt four times per engine. Four is the minimum cohort
    //    allowed to support an impact verdict; every successful sample is stored.
    const impactSnapshot: ComparableSnapshot = {};
    let successfulSamples = 0;
    let failedSamples = 0;
    for (const prompt of prompts) {
        impactSnapshot[prompt] = {};
        const measurement = await runVisibilityMeasurement({
            prompt,
            brandName,
            brandDomain,
            competitors,
            platforms,
            samples: 4,
        }, {
            persist: async (results) => {
                const { error } = await db.from('llm_scans').insert(results.map(result => persistenceRow(context.workspaceId, result)));
                if (error) throw new Error('Failed to store intervention measurement samples.');
            },
        });
        for (const engine of measurement.engines) {
            successfulSamples += engine.successfulSamples;
            failedSamples += engine.failedSamples;
            if (engine.successfulSamples === 0) continue;
            impactSnapshot[prompt][engine.engine] = {
                mentioned: engine.mentioned === true,
                position: engine.avgPosition,
                sentiment: engine.sentiment,
                sample_count: engine.successfulSamples,
                mention_count: engine.mentions,
                mention_rate: engine.mentionRate,
                position_sample_count: engine.evidence.filter(sample => sample.status === 'succeeded' && sample.position !== null).length,
                measured_at: measurement.completedAt,
                contract_version: MEASUREMENT_CONTRACT_VERSION,
            };
        }
    }

    if (successfulSamples === 0) {
        return NextResponse.json({
            error: 'All measurement samples failed. The intervention was not marked as measured.',
            failedSamples,
        }, { status: 502 });
    }

    // 4. Compute a summary delta vs baseline.
    const summary = compareVisibilitySnapshots(interv.baseline_snapshot ?? {}, impactSnapshot);

    // 5. Persist
    const { data: updated, error: updErr } = await db
        .from('interventions')
        .update({
            impact_snapshot: impactSnapshot,
            impact_summary: summary,
            status: 'measured',
        })
        .eq('id', id)
        .select()
        .single();

    if (updErr) {
        console.error('[interventions/measure] update failed:', updErr);
        return NextResponse.json({ error: 'Failed to save impact' }, { status: 500 });
    }

    const { error: eventError } = await db.from('action_events').upsert({
        action_id: id,
        workspace_id: context.workspaceId,
        actor_id: context.userId,
        event_type: 'measured',
        from_status: interv.status,
        to_status: 'measured',
        changes: { impact_summary: summary },
        idempotency_key: `measured:${requestKey}`,
    }, { onConflict: 'action_id,idempotency_key', ignoreDuplicates: true });
    if (eventError) {
        console.error('[interventions/measure-event] insert failed:', eventError);
        return NextResponse.json({ error: 'Measurement was saved, but its audit event failed. Retry safely.' }, { status: 500 });
    }

    return NextResponse.json({ intervention: updated, summary, successfulSamples, failedSamples });
}
