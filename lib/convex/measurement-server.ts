import 'server-only';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation, fetchAuthQuery } from '@/lib/auth-server';
import type { VisibilityMeasurementInput } from '@/lib/measurement/service';
import type { VisibilityMeasurementRun } from '@/lib/measurement/types';
import { storedReceipt } from './measurement-receipt';

export async function readMeasurement(workspaceId: string, runId: string) {
  const run = await fetchAuthQuery(api.measurements.get, { workspaceId, runId });
  return { ...run, result: run.resultUrl ? await storedReceipt(run.resultUrl, runId) : run.result };
}

export async function startMeasurement(workspaceId: string, requestId: string, input: VisibilityMeasurementInput): Promise<string> {
  return fetchAuthMutation(api.measurements.begin, { workspaceId, requestId, input });
}

export async function waitForMeasurement(workspaceId: string, runId: string, timeoutMs = 230_000): Promise<VisibilityMeasurementRun | null> {
  const deadline = Date.now() + timeoutMs;
  do {
    const run = await readMeasurement(workspaceId, runId);
    if (run.result) return run.result;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (Date.now() < deadline);
  return null;
}
