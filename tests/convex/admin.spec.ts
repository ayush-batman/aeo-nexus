import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';
test('ordinary organization owners cannot access platform administration', async () => {
  const { owner, t, context } = await fixture();
  const paginationOpts = { numItems: 50, cursor: null };
  await expect(owner.query(api.admin.organizations, { paginationOpts })).rejects.toThrow('forbidden_role');
  await expect(owner.query(api.admin.members, { paginationOpts })).rejects.toThrow('forbidden_role');
  await expect(owner.query(api.admin.scanUsage, { paginationOpts })).rejects.toThrow('forbidden_role');
  await t.run(async ctx => { const user = await ctx.db.query('users').withIndex('by_public_id', q => q.eq('publicId', context.userId)).unique(); await ctx.db.patch(user!._id, { isSuperAdmin: true }); });
  const orgs = await owner.query(api.admin.organizations, { paginationOpts });
  expect(orgs.page).toHaveLength(2);
  expect(orgs.page[0]).not.toHaveProperty('_id');
});
