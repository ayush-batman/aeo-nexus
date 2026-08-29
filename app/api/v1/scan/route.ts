import { randomUUID } from 'node:crypto';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { ApiV1Error, getWorkspaceBrand, withKey } from '@/lib/api-v1';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import { scanResultPersistenceRow } from '@/lib/measurement/persistence';

export const maxDuration = 60;

// POST /api/v1/scan — a fresh, versioned multi-sample visibility measurement.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'measure', async (ctx, admin) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';
    if (!prompt || !brandName) {
      throw new ApiV1Error(400, 'invalid_scan_request', 'prompt and brandName are required');
    }

    const samples = Math.min(8, Math.max(1, Math.floor(Number(body.samples) || 4)));
    const brandDomain = typeof body.brandDomain === 'string' ? body.brandDomain : undefined;
    const competitors = Array.isArray(body.competitors)
      ? body.competitors.map(String)
      : (await getWorkspaceBrand(admin, ctx.workspaceId)).competitors;

    const available = getAvailablePlatforms().filter((platform) => platform.available).map((platform) => platform.platform);
    const entitlements = await getEntitlements(ctx.orgId, admin);
    const platforms = available.filter((platform) => entitlements.engines.includes(platform)) as LLMPlatform[];
    if (platforms.length === 0) {
      throw new ApiV1Error(503, 'no_engines_available', 'No entitled engines are currently configured.');
    }

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    if (idempotencyKey && idempotencyKey.length > 100) {
      throw new ApiV1Error(400, 'invalid_idempotency_key', 'Idempotency-Key must be 100 characters or fewer.');
    }
    const requestId = `${ctx.keyId}:${idempotencyKey || randomUUID()}`;
    const reservation = await reserveScanQuota(ctx.orgId, requestId, admin);
    if (reservation === 'denied') {
      throw new ApiV1Error(429, 'weekly_scan_quota_exceeded', 'Weekly scan quota exceeded.');
    }
    if (reservation === 'duplicate') {
      throw new ApiV1Error(409, 'duplicate_scan_request', 'This Idempotency-Key has already been used.');
    }

    const measurement = await runVisibilityMeasurement({
      prompt,
      brandName,
      brandDomain,
      competitors,
      platforms,
      samples,
      mode: body.mode === 'battle' ? 'battle' : 'standard',
    }, {
      persist: async (results) => {
        const { error } = await admin.from('llm_scans').insert(results.map((result) => scanResultPersistenceRow(ctx.workspaceId, result)));
        if (error) {
          console.error('[v1/scan] failed to persist samples:', error);
          throw new Error('Failed to store measurement samples.');
        }
      },
    });

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
      visibility: measurement.visibilityScore ?? 0,
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
