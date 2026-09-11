import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';
import { nextScheduledTime } from '../../convex/scheduled';
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
