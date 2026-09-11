import { expect, test, vi } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';
import { consumeAuthLimit } from '../../convex/lib/authLimit';

test('paid AI helpers require a verified workspace editor before calling a provider', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const calls = vi.fn(); vi.stubGlobal('fetch', calls);
  try {
    await expect(t.action(api.contentActions.writer, { workspaceId: context.workspaceId, topic: 'Topic', contentType: 'Article' })).rejects.toThrow();
    await expect(owner.action(api.contentActions.writer, { workspaceId: foreignWorkspace, topic: 'Topic', contentType: 'Article' })).rejects.toThrow('workspace_not_found');
    await t.run(async ctx => { const membership = await ctx.db.query('memberships').first(); await ctx.db.patch(membership!._id, { role: 'viewer' }); });
    await expect(owner.action(api.contentActions.forumReply, { workspaceId: context.workspaceId, threadTitle: 'Title' })).rejects.toThrow('forbidden_role');
    expect(calls).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
test('schema drafts never invent missing product prices or business addresses', async () => {
  const { owner, context } = await fixture();
  const result = await owner.action(api.contentActions.schema, { workspaceId: context.workspaceId, schemaType: 'product', brandName: 'Example' });
  expect(JSON.parse(result.schemaJson)).toEqual({ '@context': 'https://schema.org', '@type': 'Product', name: 'Example' });
  expect(result.status).toBe('draft'); expect(result.missingFields.length).toBeGreaterThan(0);
});
test('authentication limits share atomic counts across independent invocations', async () => {
  const { t } = await fixture();
  const results = await Promise.all(Array.from({ length: 10 }, () => t.action(internal.authActions.consume, { key: 'synthetic-client/path', window: 60, max: 5 })));
  expect(results.filter(result => result.allowed)).toHaveLength(5);
  expect(results.filter(result => !result.allowed).every(result => (result.retryAfter ?? 0) > 0)).toBe(true);
});

test('inline HTTP auth limits share existing counters and retain hashed keys', async () => {
  const { t } = await fixture();
  const args = { key: 'synthetic-client/inline-path', window: 60, max: 2 };
  expect((await t.action(internal.authActions.consume, args)).allowed).toBe(true);
  const inline = () => t.action(ctx => consumeAuthLimit(ctx, args));
  expect((await inline()).allowed).toBe(true);
  expect((await inline()).allowed).toBe(false);
  const runMutation = vi.fn(async (ref: unknown, input?: unknown) => {
    expect(ref).toBeDefined(); expect(input).toBeDefined();
    return { ok: true, retryAfter: 0 };
  });
  await consumeAuthLimit({ runMutation }, { ...args, key: 'abc' });
  expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
    namespace: 'auth', key: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  });
});
