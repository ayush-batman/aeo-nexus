import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ApiV1Error, withKey } from '@/lib/api-v1';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import type { VisibilityMeasurementRun } from '@/lib/measurement/types';
import { apiReceipt } from '@/lib/convex/measurement-receipt';

export const maxDuration = 300;

// POST /api/v1/scan — a fresh, versioned multi-sample visibility measurement.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'measure', async (ctx) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';
    if (!prompt || !brandName) {
      throw new ApiV1Error(400, 'invalid_scan_request', 'prompt and brandName are required');
    }

    const samples = body.samples === undefined ? 4 : body.samples;
    if (typeof samples !== 'number' || !Number.isInteger(samples) || samples < 1 || samples > 8 ||
      (body.mode !== undefined && !['battle', 'standard'].includes(body.mode)) ||
      (body.competitors !== undefined && (!Array.isArray(body.competitors) || body.competitors.length > 20 ||
        body.competitors.some((value: unknown) => typeof value !== 'string' || !value.trim() || value.length > 200))))
      throw new ApiV1Error(400, 'invalid_scan_request', 'samples must be an integer from 1 to 8, mode standard or battle, and competitors up to 20 names.');
    const brandDomain = typeof body.brandDomain === 'string' ? body.brandDomain : undefined;
    const competitors = Array.isArray(body.competitors)
      ? body.competitors.map((name: string) => name.trim())
      : undefined;

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    if (idempotencyKey && idempotencyKey.length > 100) throw new ApiV1Error(400, 'invalid_idempotency_key', 'Idempotency-Key must be 100 characters or fewer.');
    const requestId = `${ctx.keyId}:${idempotencyKey || randomUUID()}`;
    const runId = await callInternal('mutation', internal.apiWrites.beginScan, {
      keyId: ctx.keyId, requestId, prompt, brandName, brandDomain, competitors, samples,
      mode: body.mode === 'battle' ? 'battle' : 'standard',
    });
    let measurement: VisibilityMeasurementRun | null = null;
    const deadline = Date.now() + 230_000;
    do {
      measurement = await apiReceipt(await callInternal('query', internal.apiWrites.scanResult, { keyId: ctx.keyId, runId }));
      if (measurement) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (Date.now() < deadline);
    if (!measurement) return NextResponse.json({ runId, requestId, runStatus: 'running',
      statusUrl: `/api/v1/scans/${runId}` }, { status: 202 });

    if (measurement.status === 'all_failed') {
      throw new ApiV1Error(
        502,
        'all_engines_failed',
        'Every requested engine failed, so no visibility measurement was produced.',
      );
    }

    // Keep legacy fields for existing API/MCP clients. `measurement` is the
    // canonical receipt and new clients should prefer it.
    const engines = measurement.engines
      .filter((engine) => engine.successfulSamples > 0)
      .map((engine) => ({
        engine: engine.engine,
        mentioned: engine.mentioned,
        mentionRate: engine.mentionRate,
        avgPosition: engine.avgPosition,
        sentiment: engine.sentiment,
        samples: engine.successfulSamples,
        confidence: engine.confidence.level,
        citations: engine.citations,
        evidence: engine.evidence
          .filter((sample) => sample.status === 'succeeded')
          .map((sample) => ({
            sample: sample.sampleNumber,
            sampleId: sample.sampleId,
            mentioned: sample.mentioned,
            position: sample.position,
            sentiment: sample.sentiment,
            snippet: sample.responseSnippet,
          })),
      }));
    const succeededEngines = measurement.engines
      .filter((engine) => engine.successfulSamples > 0)
      .map((engine) => engine.engine);
    const failedEngines = measurement.engines
      .filter((engine) => engine.successfulSamples === 0)
      .map((engine) => engine.engine);

    return {
      prompt,
      brandName,
      samples,
      visibility: measurement.visibilityScore,
      engines,
      requestedEngines: measurement.requestedEngines,
      succeededEngines,
      failedEngines,
      failures: measurement.failures.map((failure) => ({
        sample: failure.sampleNumber,
        platform: failure.engine,
        error: failure.error,
      })),
      runStatus: measurement.status,
      persistence: measurement.persistence,
      requestId,
      contractVersion: measurement.contractVersion,
      runId: measurement.runId,
      measurement,
      note: 'Each engine is multi-sampled. Confidence uses a 95% Wilson interval; inspect the canonical measurement receipt for sample and failure evidence.',
    };
  }, { limitPerMinute: 10, bucket: 'scan' });
}
