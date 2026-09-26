import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';
import { nextScheduledTime } from '../../convex/scheduled';
import { internal } from '../../convex/_generated/api';
import { runVisibilityMeasurement } from '../../lib/measurement/service';
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv('GEMINI_API_KEY', 'synthetic-not-a-provider-key'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
test('three buyer prompts reserve one quota unit and replay without creating scans', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const prompts = ['Who measures AI answers?', 'Which tools show citations?', 'How do I measure repeatability?'];
  const input = { workspaceId: context.workspaceId, prompts, requestId: crypto.randomUUID() };
  const id = await owner.mutation(api.activation.begin, input);
  expect(await owner.mutation(api.activation.begin, input)).toBe(id);
  expect(await t.run(async ctx => (await ctx.db.query('scanQuotaReservations').collect()).length)).toBe(1);
  expect(await t.run(async ctx => (await ctx.db.query('measurementRuns').collect()).length)).toBe(3);
  expect(await t.run(async ctx => (await ctx.db.query('measurementSamples').collect()).length)).toBe(12);
  expect(await owner.query(api.activation.get, { workspaceId: context.workspaceId, packetId: id })).toMatchObject({ pending: true, runIds: expect.any(Array) });
  await expect(owner.mutation(api.activation.begin, { ...input, prompts: [...prompts.slice(0, 2), 'Changed prompt'] })).rejects.toThrow('request_id_conflict');
  await expect(owner.mutation(api.activation.begin, { ...input, workspaceId: foreignWorkspace })).rejects.toThrow('workspace_not_found');
});
test('monthly recurrence clamps to month end rather than silently skipping February', () => {
  expect(new Date(nextScheduledTime('monthly', Date.parse('2026-01-31T10:00:00Z'))).toISOString()).toBe('2026-02-28T10:00:00.000Z');
  expect(new Date(nextScheduledTime('monthly', Date.parse('2028-01-31T10:00:00Z'))).toISOString()).toBe('2028-02-29T10:00:00.000Z');
});
test('first-results mail waits for persisted runs and is scheduled only once', async () => {
  const { t, owner, context } = await fixture();
  const packetId = crypto.randomUUID();
  await owner.mutation(api.activation.begin, { workspaceId: context.workspaceId,
    prompts: ['Buyer question one?', 'Buyer question two?', 'Buyer question three?'], requestId: packetId });
  await t.mutation(internal.scheduled.reconcileInitialJobs, {});
  let scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
  expect(scheduled.filter((item) => item.name === 'mailActions:firstResults')).toHaveLength(0);
  const runs = await t.run(async (ctx) => {
    const packet = await ctx.db.query('decisionPackets').withIndex('by_public_id', (q) => q.eq('publicId', packetId)).unique();
    return Promise.all((packet!.measurementRunIds ?? []).map(async (publicId) => ctx.db.query('measurementRuns')
      .withIndex('by_public_id', (q) => q.eq('publicId', publicId)).unique()));
  });
  for (const run of runs) {
    if (!run) throw new Error('missing_test_run');
    let call = 0;
    const result = await runVisibilityMeasurement(run.input, { runId: run.publicId,
      execute: async () => ++call === 1 ? { results: [{ platform: 'gemini', prompt: run.input.prompt,
        response: 'Synthetic Aelo answer.', brandMentioned: true, brandVariants: [], mentionPosition: 1,
        sentiment: 'neutral', sentimentScore: 0, sentimentReason: 'Synthetic test', competitorsMentioned: [],
        competitorPositions: [], citations: [], sampleId: `sample-${run.publicId}`, listItems: [], confidence: 1,
        timestamp: new Date().toISOString() }], errors: [] } : { results: [], errors: [{ platform: 'gemini', error: 'synthetic_failure' }] },
      persist: async () => {} });
    await t.run((ctx) => ctx.db.patch(run._id, { status: 'partial', result, updatedAt: Date.now() }));
  }
  await t.mutation(internal.scheduled.reconcileInitialJobs, {});
  await t.mutation(internal.scheduled.reconcileInitialJobs, {});
  scheduled = await t.run((ctx) => ctx.db.system.query('_scheduled_functions').collect());
  expect(scheduled.filter((item) => item.name === 'mailActions:firstResults')).toHaveLength(1);
});
test('an all-failed onboarding run never sends a results-ready email', async () => {
  const { t, owner, context } = await fixture();
  const packetId = crypto.randomUUID();
  await owner.mutation(api.activation.begin, { workspaceId: context.workspaceId,
    prompts: ['Question one?', 'Question two?', 'Question three?'], requestId: packetId });
  const runs = await t.run(async ctx => {
    const packet = await ctx.db.query('decisionPackets').withIndex('by_public_id', q => q.eq('publicId', packetId)).unique();
    return Promise.all((packet!.measurementRunIds ?? []).map(async publicId => ctx.db.query('measurementRuns')
      .withIndex('by_public_id', q => q.eq('publicId', publicId)).unique()));
  });
  for (const run of runs) {
    if (!run) throw new Error('missing_test_run');
    const result = await runVisibilityMeasurement(run.input, { runId: run.publicId,
      execute: async () => ({ results: [], errors: [{ platform: 'gemini', error: 'synthetic_failure' }] }),
      persist: async () => {} });
    await t.run(ctx => ctx.db.patch(run._id, { status: 'all_failed', result, updatedAt: Date.now() }));
  }
  await t.mutation(internal.scheduled.reconcileInitialJobs, {});
  const scheduled = await t.run(ctx => ctx.db.system.query('_scheduled_functions').collect());
  expect(scheduled.filter(item => item.name === 'mailActions:firstResults')).toHaveLength(0);
});
