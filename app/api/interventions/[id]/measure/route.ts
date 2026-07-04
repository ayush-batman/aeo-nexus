import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { scanLLM, getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';

export const maxDuration = 60;

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
    const platforms = getAvailablePlatforms()
        .filter(p => p.available && p.platform !== 'mock')
        .map(p => p.platform);
    if (platforms.length === 0) {
        return NextResponse.json({ error: 'No LLM providers configured' }, { status: 503 });
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

    // 3. Scan each prompt on each platform; also persist the scans so the
    //    dashboard reflects the follow-up.
    const impactSnapshot: Record<string, Record<string, { mentioned: boolean; position: number | null; sentiment: string | null }>> = {};
    for (const prompt of prompts) {
        impactSnapshot[prompt] = {};
        const { results } = await scanLLM({
            prompt,
            brandName,
            brandDomain,
            competitors,
            platforms: platforms as LLMPlatform[],
        });
        for (const r of results) {
            impactSnapshot[prompt][r.platform] = {
                mentioned: r.brandMentioned,
                position: r.mentionPosition,
                sentiment: r.sentiment,
            };
        }
        if (results.length > 0) {
            const scanInserts = results.map(r => ({
                workspace_id: context.workspaceId,
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
            const { error: insertErr } = await db.from('llm_scans').insert(scanInserts);
            if (insertErr) console.error('[interventions/measure] scan insert failed:', insertErr);
        }
    }

    // 4. Compute a summary delta vs baseline.
    const summary = summarizeDelta(interv.baseline_snapshot ?? {}, impactSnapshot);

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

    return NextResponse.json({ intervention: updated, summary });
}

// ── delta helper ────────────────────────────────────────────────────────────
// Averages across (prompt, platform) pairs present in both snapshots.
// visibility_change: percentage-point change of "mention rate"
// position_change: change in average mention_position (negative = moved up)
// verdict: improved | no_change | regressed
function summarizeDelta(
    baseline: Record<string, Record<string, { mentioned: boolean; position: number | null; sentiment: string | null }>>,
    followup: Record<string, Record<string, { mentioned: boolean; position: number | null; sentiment: string | null }>>,
): { visibility_change: number; position_change: number | null; verdict: 'improved' | 'no_change' | 'regressed'; measured_at: string } {
    let baseMentions = 0, baseTotal = 0, basePosSum = 0, basePosCount = 0;
    let followMentions = 0, followTotal = 0, followPosSum = 0, followPosCount = 0;

    for (const prompt of Object.keys(followup)) {
        const bMap = baseline[prompt] ?? {};
        const fMap = followup[prompt] ?? {};
        const platforms = new Set([...Object.keys(bMap), ...Object.keys(fMap)]);
        for (const plat of platforms) {
            const b = bMap[plat], f = fMap[plat];
            if (b) {
                baseTotal++;
                if (b.mentioned) baseMentions++;
                if (typeof b.position === 'number') { basePosSum += b.position; basePosCount++; }
            }
            if (f) {
                followTotal++;
                if (f.mentioned) followMentions++;
                if (typeof f.position === 'number') { followPosSum += f.position; followPosCount++; }
            }
        }
    }

    const basePct = baseTotal > 0 ? (baseMentions / baseTotal) * 100 : 0;
    const followPct = followTotal > 0 ? (followMentions / followTotal) * 100 : 0;
    const visibilityChange = Math.round(followPct - basePct);

    const baseAvgPos = basePosCount > 0 ? basePosSum / basePosCount : null;
    const followAvgPos = followPosCount > 0 ? followPosSum / followPosCount : null;
    let positionChange: number | null = null;
    if (baseAvgPos !== null && followAvgPos !== null) {
        positionChange = Math.round((followAvgPos - baseAvgPos) * 10) / 10;
    }

    // Verdict: mention rate up OR position moved up (lower number) = improved
    let verdict: 'improved' | 'no_change' | 'regressed' = 'no_change';
    if (visibilityChange > 5 || (positionChange !== null && positionChange < -0.5)) verdict = 'improved';
    else if (visibilityChange < -5 || (positionChange !== null && positionChange > 0.5)) verdict = 'regressed';

    return {
        visibility_change: visibilityChange,
        position_change: positionChange,
        verdict,
        measured_at: new Date().toISOString(),
    };
}
