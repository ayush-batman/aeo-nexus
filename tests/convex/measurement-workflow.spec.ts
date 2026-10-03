import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import { scanLLM, type ScanResult } from '../../lib/ai/llm-scanner';
import { fixture } from './fixtures';

vi.mock('../../lib/ai/llm-scanner', async (loadOriginal) => ({
  ...await loadOriginal<typeof import('../../lib/ai/llm-scanner')>(), scanLLM: vi.fn(),
}));
beforeEach(() => { vi.useFakeTimers(); vi.mocked(scanLLM).mockReset(); });
afterEach(() => vi.useRealTimers());

const input = { prompt: 'Which measurement product should I use?', brandName: 'Aelo', platforms: ['gemini' as const], samples: 4 };
function sampleResult(index: number): ScanResult {
  return { platform: 'gemini', prompt: input.prompt, response: index % 2 ? 'Aelo measures AI answers.' : 'Another product measures answers.',
    brandMentioned: index % 2 === 1, brandVariants: [], mentionPosition: null, sentiment: 'neutral',
    sentimentScore: 0, sentimentReason: 'Synthetic regression fixture', competitorsMentioned: [], competitorPositions: [],
    citations: [], sampleId: `synthetic-sample-${index}`, listItems: [], confidence: 1, timestamp: new Date().toISOString(),
    providerModel: 'synthetic-model', measurementRegion: 'test', measurementMode: 'standard',
    scorerVersion: 'aelo-brand-scorer.v2', measurementContractVersion: 'measurement.v2',
    searchMode: 'test_search', analyzerMethod: 'deterministic-test', analyzerModel: 'none', analyzerPromptVersion: 'test-v2' };
}

test('durable workflow persists every successful sample once and returns a four-sample receipt', async () => {
  const { t, owner, context } = await fixture();
  let calls = 0;
  vi.mocked(scanLLM).mockImplementation(async () => ({ results: [sampleResult(++calls)], errors: [] }));
  const runId = await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'test-run', input });
  expect(await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'test-run', input })).toBe(runId);
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTimeAsync(1000));
  const receipt = await owner.query(api.measurements.get, { workspaceId: context.workspaceId, runId });
  expect(receipt.result).toMatchObject({ runId, status: 'complete', visibilityScore: 50,
    persistence: { status: 'stored', rows: 4 } });
  expect(receipt.progress).toEqual({ requested: 4, pending: 0, running: 0, succeeded: 4, failed: 0 });
  expect(receipt.result?.engines[0].confidence.sampleCount).toBe(4);
  expect(calls).toBe(4);
  const rows = await t.run(async (ctx) => ({ scans: await ctx.db.query('scans').take(20), quotas: await ctx.db.query('scanQuotaReservations').take(20), run: await ctx.db.query('measurementRuns').first() }));
  expect(rows.scans).toHaveLength(4);
  expect(rows.quotas).toHaveLength(1);
  if (!rows.run) throw new Error('missing_run');
  await t.action(internal.measurementActions.finalize, { runId: rows.run._id });
  expect(await t.run(async (ctx) => (await ctx.db.query('scans').take(20)).length)).toBe(4);
});

test('provider failures remain missing observations and are never retried into successes', async () => {
  const { t, owner, context } = await fixture();
  let calls = 0;
  vi.mocked(scanLLM).mockImplementation(async () => ++calls === 1
    ? { results: [sampleResult(calls)], errors: [] }
    : { results: [], errors: [{ platform: 'gemini', error: 'provider_timeout' }] });
  const runId = await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'partial-run', input });
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTimeAsync(1000));
  const receipt = await owner.query(api.measurements.get, { workspaceId: context.workspaceId, runId });
  expect(receipt.result).toMatchObject({ status: 'partial', visibilityScore: 100,
    persistence: { rows: 1 }, engines: [{ successfulSamples: 1, failedSamples: 3, mentions: 1 }] });
  expect(receipt.result?.samples.filter((sample) => sample.mentioned === null)).toHaveLength(3);
  expect(calls).toBe(4);
  const stored = await t.run(async (ctx) => ({
    scans: await ctx.db.query('scans').collect(),
    metrics: await ctx.db.query('scanMetrics').collect(),
  }));
  expect(stored.scans).toHaveLength(4);
  expect(stored.scans.filter((row) => row.failureCode === 'provider_timeout')).toHaveLength(3);
  expect(stored.metrics).toHaveLength(1);
});

test('quotas, request replay and engine entitlements are enforced atomically at the backend', async () => {
  const { owner, context, foreignWorkspace } = await fixture();
  await expect(owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'wrong-engine', input: { ...input, platforms: ['claude'] } })).rejects.toThrow('engine_not_entitled');
  await expect(owner.mutation(api.measurements.begin, { workspaceId: foreignWorkspace, requestId: 'foreign', input })).rejects.toThrow('workspace_not_found');
  await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'one', input });
  await expect(owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'one', input: { ...input, prompt: 'A different prompt' } })).rejects.toThrow('request_id_conflict');
  await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'two', input });
  await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'three', input });
  await expect(owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'four', input })).rejects.toThrow('scan_quota_exceeded');
});

test('large receipts preserve complete citation evidence in authorized file storage', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  let calls = 0;
  vi.mocked(scanLLM).mockImplementation(async () => {
    const result = sampleResult(++calls);
    result.citations = [{ url: `https://example.com/source-${calls}`, title: 'Synthetic source', is_own_domain: false,
      provenance: 'provider_citation', provider: 'gemini', sample_id: result.sampleId,
      raw_provider_reference: { providerEvidence: 'x'.repeat(100000) }, fetch_validation: 'not_checked' }];
    return { results: [result], errors: [] };
  });
  const runId = await owner.mutation(api.measurements.begin, { workspaceId: context.workspaceId, requestId: 'large-receipt', input });
  await t.finishAllScheduledFunctions(() => vi.advanceTimersByTimeAsync(1000));
  const receipt = await owner.query(api.measurements.get, { workspaceId: context.workspaceId, runId });
  expect(receipt.status).toBe('complete'); expect(receipt.result).toBeNull(); expect(receipt.resultUrl).toBeTruthy();
  await expect(owner.query(api.measurements.get, { workspaceId: foreignWorkspace, runId })).rejects.toThrow('workspace_not_found');
  const stored = await t.run(async ctx => {
    const run = await ctx.db.query('measurementRuns').first();
    if (!run?.resultStorageId) throw new Error('missing_stored_receipt');
    const blob = await ctx.storage.get(run.resultStorageId);
    if (!blob) throw new Error('missing_evidence');
    return { receipt: JSON.parse(await blob.text()), documentBytes: JSON.stringify(run).length, metrics: await ctx.db.query('scanMetrics').take(10) };
  });
  expect(stored.receipt.samples).toHaveLength(4);
  expect(stored.receipt.samples[0].citations[0].raw_provider_reference.providerEvidence).toHaveLength(100000);
  expect(stored.documentBytes).toBeLessThan(600000);
  expect(stored.metrics).toHaveLength(4);
  expect(JSON.stringify(stored.metrics)).not.toContain('providerEvidence');
});
