import { NextRequest, NextResponse } from 'next/server';
import { scanLLM, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { reserveScanQuota } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60;

type ClaimedSchedule = {
    schedule_id: string;
    workspace_id: string;
    workspace_name: string | null;
    org_id: string;
    prompt: string;
    platforms: string[];
    competitors: string[] | null;
    frequency: 'daily' | 'weekly' | 'monthly';
    scheduled_for: string;
    claim_token: string;
};

function nextRunAt(frequency: ClaimedSchedule['frequency']): string {
    const next = new Date();
    if (frequency === 'daily') next.setUTCDate(next.getUTCDate() + 1);
    if (frequency === 'weekly') next.setUTCDate(next.getUTCDate() + 7);
    if (frequency === 'monthly') next.setUTCMonth(next.getUTCMonth() + 1);
    return next.toISOString();
}

export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (!cronSecret) {
        console.error('[process-scans] CRON_SECRET is not configured');
        return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
    }
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const admin = createAdminClient();
        const { data, error } = await admin.rpc('claim_due_scheduled_scans', {
            p_limit: 10,
            p_lease_seconds: 300,
        });
        if (error) {
            console.error('[process-scans] failed to claim schedules:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const schedules = (data ?? []) as ClaimedSchedule[];
        if (schedules.length === 0) {
            return NextResponse.json({ success: true, processed: 0, details: [] });
        }

        const details: Array<Record<string, unknown>> = [];
        for (const schedule of schedules) {
            const finish = async (status: string) => {
                const { error: updateError } = await admin
                    .from('scheduled_scans')
                    .update({
                        claim_token: null,
                        claim_expires_at: null,
                        last_run_status: status,
                        last_run_at: new Date().toISOString(),
                        next_run_at: nextRunAt(schedule.frequency),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', schedule.schedule_id)
                    .eq('claim_token', schedule.claim_token);
                if (updateError) throw new Error(`Could not finish schedule claim: ${updateError.message}`);
            };

            try {
                if (!Array.isArray(schedule.platforms) || schedule.platforms.length === 0) {
                    await finish('invalid_no_platforms');
                    details.push({ id: schedule.schedule_id, status: 'skipped', reason: 'no_platforms' });
                    continue;
                }

                const reservationId = `schedule:${schedule.schedule_id}:${schedule.scheduled_for}`;
                const reservation = await reserveScanQuota(schedule.org_id, reservationId, admin);
                if (reservation !== 'reserved') {
                    const status = reservation === 'denied' ? 'skipped_limit_reached' : 'skipped_duplicate';
                    await finish(status);
                    details.push({ id: schedule.schedule_id, status: 'skipped', reason: reservation });
                    continue;
                }

                const { results, errors } = await scanLLM({
                    prompt: schedule.prompt,
                    brandName: schedule.workspace_name || 'My Brand',
                    competitors: schedule.competitors || [],
                    platforms: schedule.platforms as LLMPlatform[],
                    mode: 'standard',
                });

                if (results.length > 0) {
                    const { error: insertError } = await admin.from('llm_scans').insert(results.map((result) => ({
                        workspace_id: schedule.workspace_id,
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
                    })));
                    if (insertError) throw new Error(`Could not save scan results: ${insertError.message}`);
                }

                const status = results.length === 0 ? 'all_failed' : errors.length > 0 ? 'partial' : 'complete';
                await finish(status);
                details.push({
                    id: schedule.schedule_id,
                    status,
                    scans_count: results.length,
                    errors_count: errors.length,
                });
            } catch (error) {
                console.error(`[process-scans] schedule ${schedule.schedule_id} failed:`, error);
                try {
                    await finish('failed');
                } catch (finishError) {
                    console.error(`[process-scans] failed to release claim ${schedule.schedule_id}:`, finishError);
                }
                details.push({ id: schedule.schedule_id, status: 'failed' });
            }
        }

        return NextResponse.json({ success: true, processed: details.length, details });
    } catch (error) {
        console.error('[process-scans] cron failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
