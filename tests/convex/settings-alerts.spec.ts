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
