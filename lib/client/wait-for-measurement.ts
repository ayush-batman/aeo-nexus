import type { VisibilityMeasurementRun } from '../measurement/types';

export type MeasurementProgress = {
  requested: number;
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
};

/** Poll only our own status routes; accepting an arbitrary URL could leak a session. */
export async function waitForMeasurementJob(
  statusUrl: string,
  onProgress?: (progress: MeasurementProgress) => void,
): Promise<{ status: string; measurement?: VisibilityMeasurementRun }> {
  if (!/^\/api\/(?:llm\/runs\/[a-zA-Z0-9-]+|interventions\/[a-zA-Z0-9-]+\/measure\?job=[a-zA-Z0-9-]+)$/.test(statusUrl)) throw new Error('Invalid measurement status URL');
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const response = await fetch(statusUrl, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not check the scan. Reload to see its saved progress.');
    if (body.progress) onProgress?.(body.progress);
    const status = body.runStatus ?? body.status;
    if (status === 'all_failed') throw new Error('All samples failed. No visibility result was claimed; check engine configuration and retry.');
    if (status === 'complete' || status === 'partial' || status === 'untracked') return { status, measurement: body.measurement };
    if (status !== 'running' && status !== 'queued') throw new Error('Unknown scan status. Reload to check saved progress.');
  }
  throw new Error('The scan is still running in the background. Reload later to check its saved progress.');
}
