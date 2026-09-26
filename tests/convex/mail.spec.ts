import { afterEach, expect, test, vi } from 'vitest';
import { internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';
import { runVisibilityMeasurement } from '../../lib/measurement/service';

afterEach(() => vi.unstubAllEnvs());
async function delivery() {
  const f = await fixture();
  const id = await f.t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', f.context.workspaceId)).unique();
    const user = await ctx.db.query('users').first();
    return ctx.db.insert('emailDeliveries', { publicId: 'synthetic-delivery', workspaceId: workspace!._id, recipientId: user!._id,
      recipientEmail: user!.email, kind: 'weekly_digest', dedupeKey: 'week-one', subject: 'Local test', html: '<p>Synthetic</p>',
      status: 'pending', attempts: 0, firstAttemptAt: null, providerId: null, lastError: null, createdAt: Date.now(), updatedAt: Date.now() });
  });
  return { ...f, id };
}
test('email retry freezes the complete provider request and stops after acceptance', async () => {
  vi.stubEnv('AELO_EMAIL_FROM', 'original@example.test');
  const { t, id } = await delivery();
  const first = await t.mutation(internal.mail.claim, { id });
  vi.stubEnv('AELO_EMAIL_FROM', 'changed@example.test');
  expect(await t.mutation(internal.mail.claim, { id })).toEqual(first);
  expect(first?.from).toBe('original@example.test');
  await t.mutation(internal.mail.accepted, { id, providerId: 'synthetic-provider-id' });
  expect(await t.mutation(internal.mail.claim, { id })).toBeNull();
});
test('email does not send after membership removal or outside the deduplication window', async () => {
  vi.stubEnv('AELO_EMAIL_FROM', 'original@example.test');
  const { t, id } = await delivery();
  await t.run(async ctx => { await ctx.db.patch(id, { firstAttemptAt: Date.now()-24*3600000 }); });
  await expect(t.mutation(internal.mail.claim, { id })).rejects.toThrow('email_reconciliation_required');
  await t.run(async ctx => { const row=await ctx.db.get(id); const workspace=await ctx.db.get(row!.workspaceId);
    const member=await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id', q => q.eq('organizationId',workspace!.organizationId).eq('userId',row!.recipientId)).unique();
    await ctx.db.delete(member!._id); });
  expect(await t.mutation(internal.mail.claim, { id })).toBeNull();
  expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ status: 'skipped' });
});
test('missing email provider configuration never records a successful delivery', async () => {
  vi.stubEnv('AELO_EMAIL_FROM', 'original@example.test');
  vi.stubEnv('RESEND_API_KEY', '');
  const { t, id } = await delivery();
  await expect(t.action(internal.mailActions.deliver, { id })).rejects.toThrow('email_not_configured');
  expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ status: 'sending', providerId: null });
});
test('welcome queues once for a verified account and uses the configured site origin', async () => {
  vi.stubEnv('SITE_URL', 'https://preview.example.test/path');
  const { t, context } = await fixture();
  const ids = await t.run(async ctx => ({
    workspaceId: (await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique())!._id,
    userId: (await ctx.db.query('users').first())!._id,
  }));
  await t.action(internal.mailActions.welcome, ids);
  await t.action(internal.mailActions.welcome, ids);
  const rows = await t.run(ctx => ctx.db.query('emailDeliveries').take(10));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ kind: 'welcome', status: 'pending', recipientEmail: 'local-owner@example.test' });
  expect(rows[0].html).toContain('https://preview.example.test/onboarding');
  expect(rows[0].html).not.toContain('aelohq.com');
});
test('first-results mail labels partial evidence and is not muted by alert preferences', async () => {
  vi.stubEnv('SITE_URL', 'https://preview.example.test');
  vi.stubEnv('AELO_EMAIL_FROM', 'Aelo <updates@example.test>');
  const { t, context } = await fixture();
  const input = { prompt: 'Which product?', brandName: 'Aelo', platforms: ['gemini' as const], samples: 4 };
  let call = 0;
  const result = await runVisibilityMeasurement(input, { runId: 'synthetic-mail-run',
    execute: async () => ++call === 1 ? { results: [{ platform: 'gemini', prompt: input.prompt,
      response: 'Aelo is one option.', brandMentioned: true, brandVariants: [], mentionPosition: 1,
      sentiment: 'neutral', sentimentScore: 0, sentimentReason: 'Synthetic test', competitorsMentioned: [],
      competitorPositions: [], citations: [], sampleId: 'synthetic-mail-sample', listItems: [], confidence: 1,
      timestamp: new Date().toISOString() }], errors: [] } : { results: [], errors: [{ platform: 'gemini', error: 'synthetic_failure' }] },
    persist: async () => {} });
  const packetId = await t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique();
    const user = await ctx.db.query('users').first();
    await ctx.db.patch(workspace!._id, { name: 'Aelo\r\nBcc: other@example.test' });
    await ctx.db.insert('alertPreferences', { publicId: crypto.randomUUID(), workspaceId: workspace!._id,
      alertType: 'first_results', enabled: false, createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert('measurementRuns', { publicId: result.runId, workspaceId: workspace!._id,
      organizationId: workspace!.organizationId, requestId: 'test-first-results', input, status: 'partial', result,
      workflowId: null, createdAt: Date.now(), updatedAt: Date.now() });
    return ctx.db.insert('decisionPackets', { publicId: crypto.randomUUID(), workspaceId: workspace!._id,
      contractVersion: 'test', status: 'partial', prompts: ['Buyer question'], packet: {}, measurementRunIds: [result.runId],
      createdBy: user!._id, createdAt: Date.now() });
  });
  await t.action(internal.mailActions.firstResults, { packetId });
  await t.action(internal.mailActions.firstResults, { packetId });
  const rows = await t.run(ctx => ctx.db.query('emailDeliveries').take(10));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ kind: 'first_results', status: 'pending' });
  expect(rows[0].subject).not.toMatch(/[\r\n]/);
  expect(rows[0].html).toContain('Your first results are partial');
  expect(rows[0].html).toContain('https://preview.example.test/onboarding');
  expect(await t.mutation(internal.mail.claim, { id: rows[0]._id })).toMatchObject({ email: 'local-owner@example.test' });
  const failedPacketId = await t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique();
    const user = await ctx.db.query('users').first();
    await ctx.db.insert('measurementRuns', { publicId: 'synthetic-unsaved-run', workspaceId: workspace!._id,
      organizationId: workspace!.organizationId, requestId: 'test-unsaved-results', input, status: 'partial',
      result: { ...result, runId: 'synthetic-unsaved-run', persistence: { status: 'failed', rows: 0, error: 'synthetic_storage_failure' } },
      workflowId: null, createdAt: Date.now(), updatedAt: Date.now() });
    return ctx.db.insert('decisionPackets', { publicId: crypto.randomUUID(), workspaceId: workspace!._id,
      contractVersion: 'test', status: 'partial', prompts: ['Buyer question'], packet: {},
      measurementRunIds: ['synthetic-unsaved-run'], createdBy: user!._id, createdAt: Date.now() });
  });
  await t.action(internal.mailActions.firstResults, { packetId: failedPacketId });
  expect(await t.run(ctx => ctx.db.query('emailDeliveries').take(10))).toHaveLength(1);
});
test('missing site origin fails safely before lifecycle mail is queued', async () => {
  vi.stubEnv('SITE_URL', '');
  const { t, context } = await fixture();
  const ids = await t.run(async ctx => ({
    workspaceId: (await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique())!._id,
    userId: (await ctx.db.query('users').first())!._id,
  }));
  await expect(t.action(internal.mailActions.welcome, ids)).rejects.toThrow('email_site_url_not_configured');
  expect(await t.run(ctx => ctx.db.query('emailDeliveries').take(10))).toHaveLength(0);
});
