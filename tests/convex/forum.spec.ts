import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';

const thread = { platform: 'reddit', externalId: 'synthetic-thread', url: 'https://www.reddit.com/r/testing/comments/example', title: 'A thread is not a buyer prompt' };
test('rediscovery preserves drafts and posting creates one action with no invented prompt', async () => {
  const { t, owner, context } = await fixture();
  const created = await owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread });
  await owner.mutation(api.forum.update, { workspaceId: context.workspaceId, id: created.publicId, status: 'posted', commentDraft: 'Saved draft' });
  const rediscovered = await owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread: { ...thread, score: 10 } });
  expect(rediscovered).toMatchObject({ status: 'posted', commentDraft: 'Saved draft', score: 10 });
  await owner.mutation(api.forum.update, { workspaceId: context.workspaceId, id: created.publicId, status: 'posted' });
  const actions = await t.run(ctx => ctx.db.query('actions').take(10));
  expect(actions).toHaveLength(1);
  expect(actions[0].targetPrompts).toEqual([]);
  expect(actions[0].baselineSnapshot).toEqual({});
  expect(await t.run(ctx => ctx.db.query('actionEvents').take(10))).toHaveLength(1);
});
test('forum writes enforce membership, role, input validation and quota', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  await expect(owner.mutation(api.forum.save, { workspaceId: foreignWorkspace, thread })).rejects.toThrow('workspace_not_found');
  await expect(owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread: { ...thread, url: 'javascript:alert(1)' } })).rejects.toThrow('invalid_thread');
  for (let i = 0; i < 20; i++) await owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread: { ...thread, externalId: `thread-${i}` } });
  await expect(owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread })).rejects.toThrow('thread_quota_exceeded');
  await owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread: { ...thread, externalId: 'thread-0' } });
  await t.run(async ctx => { const membership = await ctx.db.query('memberships').first(); await ctx.db.patch(membership!._id, { role: 'viewer' }); });
  await expect(owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread })).rejects.toThrow('forbidden_role');
});
