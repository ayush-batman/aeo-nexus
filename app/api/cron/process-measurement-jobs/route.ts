import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { claimMeasurementJobs, finishMeasurementJob } from '@/lib/measurement/jobs';
import { scanResultPersistenceRow } from '@/lib/measurement/persistence';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import { createAdminClient } from '@/lib/supabase/admin';
import { evaluateMeasurementAlerts } from '@/lib/alerts/evaluate';

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error('[measurement-jobs] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  let jobs;
  try {
    jobs = await claimMeasurementJobs(admin, 1, 240);
  } catch (error) {
    console.error('[measurement-jobs] claim failed:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  const job = jobs[0];
  if (!job) return NextResponse.json({ success: true, processed: 0 });

  try {
    const entitlements = await getEntitlements(job.org_id, admin);
    const available = getAvailablePlatforms()
      .filter((engine) => engine.available && engine.platform !== 'mock')
      .map((engine) => engine.platform);
    const platforms = available
      .filter((platform) => entitlements.engines.includes(platform)) as LLMPlatform[];
    if (platforms.length === 0) {
      await finishMeasurementJob(admin, job, 'failed', {
        error: 'No entitled AI engines are currently configured.',
        retryDelaySeconds: 300,
      });
      return NextResponse.json({ success: false, processed: 1, status: 'retrying_no_engines' });
    }

    const reservation = await reserveScanQuota(job.org_id, `activation:${job.job_id}`, admin);
    if (reservation === 'denied') {
      await finishMeasurementJob(admin, job, 'skipped', { error: 'Weekly scan quota exceeded.' });
      return NextResponse.json({ success: true, processed: 1, status: 'skipped_limit_reached' });
    }

    const settings = job.workspace_settings ?? {};
    const measurement = await runVisibilityMeasurement({
      prompt: `What is ${job.workspace_name}?`,
      brandName: job.workspace_name,
      brandDomain: settings.website || undefined,
      competitors: Array.isArray(settings.competitors) ? settings.competitors : [],
      platforms,
      samples: 4,
      mode: 'standard',
    }, {
      persist: async (results) => {
        const { error } = await admin.from('llm_scans').insert(
          results.map((result) => scanResultPersistenceRow(job.workspace_id, result)),
        );
        if (error) throw new Error(`Could not save initial measurement: ${error.message}`);
      },
    });

    const result = {
      run_id: measurement.runId,
      contract_version: measurement.contractVersion,
      run_status: measurement.status,
      successful_samples: measurement.samples.filter((sample) => sample.status === 'succeeded').length,
      failed_samples: measurement.failures.length,
      persistence: measurement.persistence.status,
    };
    if (measurement.persistence.rows > 0) {
      await evaluateMeasurementAlerts(job.workspace_id, measurement.runId);
    }
    if (measurement.status === 'all_failed' || measurement.persistence.status === 'failed') {
      const willRetry = job.attempts < job.max_attempts;
      await finishMeasurementJob(admin, job, 'failed', {
        result,
        error: measurement.status === 'all_failed'
          ? 'All initial measurement samples failed.'
          : measurement.persistence.error ?? 'Initial samples were not fully stored.',
        retryDelaySeconds: Math.min(3600, 60 * (2 ** Math.max(0, job.attempts - 1))),
      });
      return NextResponse.json({ success: false, processed: 1, status: willRetry ? 'retrying' : 'failed', result });
    }

    await finishMeasurementJob(admin, job, measurement.status === 'partial' ? 'partial' : 'succeeded', { result });
    return NextResponse.json({ success: true, processed: 1, status: measurement.status, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown measurement job failure.';
    console.error(`[measurement-jobs] job ${job.job_id} failed:`, error);
    const willRetry = job.attempts < job.max_attempts;
    try {
      await finishMeasurementJob(admin, job, 'failed', {
        error: message,
        retryDelaySeconds: Math.min(3600, 60 * (2 ** Math.max(0, job.attempts - 1))),
      });
    } catch (finishError) {
      console.error(`[measurement-jobs] could not release job ${job.job_id}:`, finishError);
    }
    return NextResponse.json({ success: false, processed: 1, status: willRetry ? 'retrying' : 'failed' }, { status: 500 });
  }
}
