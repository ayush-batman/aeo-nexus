import 'server-only';
import type { VisibilityMeasurementRun } from '../measurement/types';

/** URL must come from a workspace-authorized Convex query, never user input. */
export async function storedReceipt(url: string, runId: string): Promise<VisibilityMeasurementRun> {
  const parsed = new URL(url), backend = new URL(process.env.NEXT_PUBLIC_CONVEX_URL!);
  // Convex storage URLs are issued by our own backend; prohibit redirects to
  // another service before requesting this private receipt.
  if (parsed.origin !== backend.origin || !parsed.pathname.startsWith('/api/storage/')) throw new Error('invalid_receipt_location');
  const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.body) throw new Error('measurement_evidence_unavailable');
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 32 * 1024 * 1024) throw new Error('measurement_receipt_too_large');
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  // Written only by the internal finalizer from the validated measurement
  // contract; verify identity to avoid attaching a different run's evidence.
  if (!value || typeof value !== 'object' || !('runId' in value) || value.runId !== runId ||
    !('samples' in value) || !Array.isArray(value.samples) || !('engines' in value) || !Array.isArray(value.engines)) throw new Error('invalid_measurement_receipt');
  return value as VisibilityMeasurementRun;
}
export async function apiReceipt(result: VisibilityMeasurementRun | { storageUrl: string; runId: string } | null) {
  return result && 'storageUrl' in result ? storedReceipt(result.storageUrl, result.runId) : result;
}
