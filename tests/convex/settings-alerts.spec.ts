import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';
test('settings preserve unrelated values and refuse cross-workspace writes', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  await owner.mutation(api.settings.saveWorkspace, { workspaceId: context.workspaceId, competitors: ['Peer'] });
  await owner.mutation(api.settings.saveWorkspace, { workspaceId: context.workspaceId, name: 'Actual brand' });
  expect(await owner.query(api.workspaces.get, { workspaceId: context.workspaceId })).toMatchObject({ name: 'Actual brand', settings: { competitors: ['Peer'] } });
  await expect(owner.mutation(api.settings.saveWorkspace, { workspaceId: foreignWorkspace, name: 'Wrong' })).rejects.toThrow('workspace_not_found');
  await expect(owner.mutation(api.alerts.savePreferences, { workspaceId: context.workspaceId, preferences: [{ alert_type: 'weekly_digest', enabled: false }, { alert_type: 'weekly_digest', enabled: true }] })).rejects.toThrow('invalid_preferences');
  await t.run(async ctx => { const member = await ctx.db.query('memberships').first(); await ctx.db.patch(member!._id, { role: 'viewer' }); });
  await expect(owner.mutation(api.settings.saveWorkspace, { workspaceId: context.workspaceId, name: 'Wrong' })).rejects.toThrow('forbidden_role');
  await expect(owner.mutation(api.alerts.savePreferences, { workspaceId: context.workspaceId, preferences: [] })).rejects.toThrow('forbidden_role');
  await owner.mutation(api.settings.saveProfile, { fullName: 'My own name' });
});

test('empty notification pagination returns only its public contract', async () => {
  const { owner, context } = await fixture();
  const result = await owner.query(api.alerts.notifications, {
    workspaceId: context.workspaceId,
    paginationOpts: { cursor: null, numItems: 20 },
  });
  expect(result).toEqual({ page: [], isDone: true, continueCursor: expect.any(String) });
});

test('notification badge count is bounded and workspace-bound', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const ids = await t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q =>
      q.eq('publicId', context.workspaceId)).unique();
    const foreign = await ctx.db.query('workspaces').withIndex('by_public_id', q =>
      q.eq('publicId', foreignWorkspace)).unique();
    if (!workspace || !foreign) throw new Error('missing_fixture_workspace');
    const publicIds: string[] = [];
    for (let index = 0; index < 12; index++) {
      const publicId = `badge-unread-${index}`;
      publicIds.push(publicId);
      await ctx.db.insert('notifications', { publicId, workspaceId: workspace._id, type: 'visibility_drop',
        title: 'Synthetic alert', message: 'Test only', read: false, metadata: {}, dedupeKey: null, createdAt: index });
    }
    await ctx.db.insert('notifications', { publicId: 'badge-read', workspaceId: workspace._id, type: 'visibility_drop',
      title: 'Already read', message: 'Test only', read: true, metadata: {}, dedupeKey: null, createdAt: 13 });
    await ctx.db.insert('notifications', { publicId: 'foreign-badge-unread', workspaceId: foreign._id, type: 'visibility_drop',
      title: 'Private alert', message: 'Test only', read: false, metadata: {}, dedupeKey: null, createdAt: 14 });
    return publicIds;
  });
  expect(await owner.query(api.alerts.unreadBadgeCount, { workspaceId: context.workspaceId })).toBe(10);
  await expect(owner.query(api.alerts.unreadBadgeCount, { workspaceId: foreignWorkspace })).rejects.toThrow('workspace_not_found');
  await expect(t.query(api.alerts.unreadBadgeCount, { workspaceId: context.workspaceId })).rejects.toThrow('Unauthenticated');
  await owner.mutation(api.alerts.markRead, { workspaceId: context.workspaceId, ids: ids.slice(0, 3), markAllRead: false });
  expect(await owner.query(api.alerts.unreadBadgeCount, { workspaceId: context.workspaceId })).toBe(9);
});
