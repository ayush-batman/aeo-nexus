import { expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { api, internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

test('one-time key creation stores only a hash, enforces scopes and revocation', async () => {
  const { t, owner, context } = await fixture();
  const created = await owner.action(api.apiKeyActions.create, { workspaceId: context.workspaceId, name: 'Read only', scopes: ['read'] });
  expect(created.secret).toMatch(/^alo_live_[a-f0-9]{48}$/);
  const hash = createHash('sha256').update(created.secret).digest('hex');
  const stored = await t.run(async (ctx) => ctx.db.query('apiKeys').withIndex('by_key_hash', (q) => q.eq('keyHash', hash)).unique());
  expect(stored?.publicId).toBe(created.key.id);
  expect(JSON.stringify(stored)).not.toContain(created.secret);
  expect(await t.query(internal.apiKeys.resolveHash, { hash })).toMatchObject({ workspaceId: context.workspaceId, role: 'owner' });
  expect(await t.mutation(internal.apiReads.authorize, { keyId: created.key.id, scope: 'read', bucket: 'read', limit: 120 })).toMatchObject({ ok: true });
  await expect(t.mutation(internal.apiWrites.trackPrompt, { keyId: created.key.id, prompt: 'Private mutation' })).rejects.toThrow('api_scope_denied');
  await owner.mutation(api.apiKeys.revoke, { workspaceId: context.workspaceId, id: created.key.id });
  expect(await t.query(internal.apiKeys.resolveHash, { hash })).toBeNull();
  await expect(t.query(internal.apiReads.workspace, { keyId: created.key.id })).rejects.toThrow('api_key_invalid');
});

test('API key revalidates membership and workspace binding on every backend call', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const created = await owner.action(api.apiKeyActions.create, { workspaceId: context.workspaceId, name: 'Bound key', scopes: ['read', 'measure'] });
  await expect(owner.action(api.apiKeyActions.create, { workspaceId: foreignWorkspace, name: 'Foreign', scopes: ['read'] })).rejects.toThrow('workspace_not_found');
  await t.run(async (ctx) => {
    const key = await ctx.db.query('apiKeys').withIndex('by_public_id', (q) => q.eq('publicId', created.key.id)).unique();
    if (!key) throw new Error('missing_key');
    const member = await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id', (q) => q.eq('organizationId', key.organizationId).eq('userId', key.createdBy)).unique();
    if (!member) throw new Error('missing_member');
    await ctx.db.patch(member._id, { role: 'viewer' });
  });
  await expect(t.mutation(internal.apiWrites.trackPrompt, { keyId: created.key.id, prompt: 'Create prompt' })).rejects.toThrow('forbidden_role');
  expect((await t.query(internal.apiReads.workspace, { keyId: created.key.id })).id).toBe(context.workspaceId);
  await t.run(async (ctx) => {
    const key = await ctx.db.query('apiKeys').withIndex('by_public_id', (q) => q.eq('publicId', created.key.id)).unique();
    if (!key) throw new Error('missing_key');
    const foreign = await ctx.db.query('workspaces').withIndex('by_public_id', (q) => q.eq('publicId', foreignWorkspace)).unique();
    if (!foreign) throw new Error('missing_workspace');
    await ctx.db.patch(key._id, { workspaceId: foreign._id });
  });
  await expect(t.query(internal.apiReads.workspace, { keyId: created.key.id })).rejects.toThrow('api_key_invalid');
});

test('shared API limiter counts across separate calls and does not mutate denied requests', async () => {
  const { t, owner, context } = await fixture();
  const created = await owner.action(api.apiKeyActions.create, { workspaceId: context.workspaceId, name: 'Limited', scopes: ['read'] });
  const args = { keyId: created.key.id, scope: 'read' as const, bucket: 'test', limit: 2 };
  expect((await t.mutation(internal.apiReads.authorize, args)).ok).toBe(true);
  expect((await t.mutation(internal.apiReads.authorize, args)).ok).toBe(true);
  const denied = await t.mutation(internal.apiReads.authorize, args);
  expect(denied.ok).toBe(false);
  expect(denied.retryAfter).toBeGreaterThan(0);
});

test('prompt-filtered API reads use the exact question and time window', async () => {
  const { t, owner, context } = await fixture();
  const created = await owner.action(api.apiKeyActions.create, {
    workspaceId: context.workspaceId, name: 'Prompt read', scopes: ['read'],
  });
  await t.run(async (ctx) => {
    const workspace = await ctx.db.query('workspaces')
      .withIndex('by_public_id', (q) => q.eq('publicId', context.workspaceId)).unique();
    if (!workspace) throw new Error('missing_test_workspace');
    const base = {
      workspaceId: workspace._id, platform: 'gemini' as const, response: 'A saved answer',
      brandMentioned: true, brandVariants: [], mentionPosition: 1, sentiment: null,
      sentimentScore: null, sentimentReason: null, competitorsMentioned: [], listItems: [],
      analyzerConfidence: null, analyzerMethod: null, analyzerModel: null, citations: [],
      winner: null, winnerReason: null, measurementRunId: null,
      measurementContractVersion: null, sampleNumber: null, providerModel: null,
      measurementRegion: null, measurementMode: null, scorerVersion: null,
      failureCode: null, failureMessage: null,
    };
    await ctx.db.insert('scans', { ...base, publicId: 'target-in-window', prompt: 'Which brand?', createdAt: 200 });
    await ctx.db.insert('scans', { ...base, publicId: 'failed-target', prompt: 'Which brand?',
      response: '', brandMentioned: false, failureCode: 'provider_failed', createdAt: 250 });
    await ctx.db.insert('scans', { ...base, publicId: 'other-in-window', prompt: 'Different question', createdAt: 300 });
    await ctx.db.insert('scans', { ...base, publicId: 'target-after-window', prompt: 'Which brand?', createdAt: 400 });
  });
  const args = { keyId: created.key.id, since: 100, before: 350,
    paginationOpts: { numItems: 100, cursor: null } };
  const filtered = await t.query(internal.apiReads.scans, { ...args, prompt: 'Which brand?' });
  expect(filtered.page.map((row) => row.publicId)).toEqual(['target-in-window']);
  const unfiltered = await t.query(internal.apiReads.scans, args);
  expect(unfiltered.page.map((row) => row.publicId)).toEqual(['other-in-window', 'target-in-window']);
});
