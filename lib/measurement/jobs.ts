import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

export type ClaimedMeasurementJob = {
  job_id: string;
  workspace_id: string;
  org_id: string;
  purpose: 'initial_visibility';
  attempts: number;
  max_attempts: number;
  claim_token: string;
  workspace_name: string;
  workspace_settings: {
    website?: string | null;
    competitors?: string[];
  } | null;
};

export async function claimMeasurementJobs(
  admin: AdminClient,
  limit = 1,
  leaseSeconds = 240,
): Promise<ClaimedMeasurementJob[]> {
  const { data, error } = await admin.rpc('claim_measurement_jobs', {
    p_limit: limit,
    p_lease_seconds: leaseSeconds,
  });
  if (error) throw new Error(`Could not claim measurement jobs: ${error.message}`);
  return (data ?? []) as ClaimedMeasurementJob[];
}

export async function finishMeasurementJob(
  admin: AdminClient,
  job: Pick<ClaimedMeasurementJob, 'job_id' | 'claim_token'>,
  status: 'succeeded' | 'partial' | 'failed' | 'skipped',
  options: { result?: Record<string, unknown>; error?: string; retryDelaySeconds?: number } = {},
): Promise<void> {
  const { data, error } = await admin.rpc('finish_measurement_job', {
    p_job_id: job.job_id,
    p_claim_token: job.claim_token,
    p_status: status,
    p_result: options.result ?? {},
    p_error: options.error ?? null,
    p_retry_delay_seconds: options.retryDelaySeconds ?? 60,
  });
  if (error) throw new Error(`Could not finish measurement job: ${error.message}`);
  if (data !== true) throw new Error('Measurement job claim is no longer owned.');
}
