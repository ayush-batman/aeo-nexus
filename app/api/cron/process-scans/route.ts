import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import { scanResultPersistenceRow } from '@/lib/measurement/persistence';

export const maxDuration = 300;

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
            p_limit: 1,
            p_lease_seconds: 240,
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

                const entitlements = await getEntitlements(schedule.org_id, admin);
                const available = getAvailablePlatforms()
                    .filter(platform => platform.available && platform.platform !== 'mock')
                    .map(platform => platform.platform);
                const platforms = schedule.platforms
                    .filter(platform => entitlements.engines.includes(platform) && available.includes(platform as LLMPlatform)) as LLMPlatform[];
                if (platforms.length === 0) {
                    await finish('skipped_no_engines');
                    details.push({ id: schedule.schedule_id, status: 'skipped', reason: 'no_entitled_configured_engines' });
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

                const { data: renewed, error: renewError } = await admin.rpc('renew_scheduled_scan_claim', {
                    p_schedule_id: schedule.schedule_id,
                    p_claim_token: schedule.claim_token,
                    p_lease_seconds: 240,
                });
                if (renewError || renewed !== true) {
                    throw new Error(`Could not renew schedule claim: ${renewError?.message ?? 'claim no longer owned'}`);
                }

                const measurement = await runVisibilityMeasurement({
                    prompt: schedule.prompt,
                    brandName: schedule.workspace_name || 'My Brand',
                    competitors: schedule.competitors || [],
                    platforms,
                    samples: 4,
                    mode: 'standard',
                }, {
                    persist: async (results) => {
                        const { error } = await admin.from('llm_scans').insert(
                            results.map(result => scanResultPersistenceRow(schedule.workspace_id, result)),
                        );
                        if (error) throw new Error(`Could not save measurement samples: ${error.message}`);
                    },
                });

                const status = measurement.status;
                await finish(status);
                details.push({
                    id: schedule.schedule_id,
                    status,
                    run_id: measurement.runId,
                    contract_version: measurement.contractVersion,
                    successful_samples: measurement.samples.filter(sample => sample.status === 'succeeded').length,
                    failed_samples: measurement.failures.length,
                    persistence: measurement.persistence.status,
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
