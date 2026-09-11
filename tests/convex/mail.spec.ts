import { afterEach, expect, test, vi } from 'vitest';
import { internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

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
