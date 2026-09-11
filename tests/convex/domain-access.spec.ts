/// <reference types="vite/client" />
import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';

import { fixture } from './fixtures';

test('real session permits own data and denies unauthenticated and foreign workspace reads', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const input = { workspaceId: context.workspaceId, paginationOpts: { numItems: 10, cursor: null } };
  expect((await owner.query(api.products.list, input)).page).toEqual([]);
  await expect(t.query(api.products.list, input)).rejects.toThrow('Unauthenticated');
  await expect(owner.query(api.products.list, { ...input, workspaceId: foreignWorkspace })).rejects.toThrow('workspace_not_found');
  await expect(owner.query(api.workspaces.get, { workspaceId: foreignWorkspace })).rejects.toThrow('workspace_not_found');
});

test('prompt create, edit, paginated read and delete retain scope and role checks', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const first = await owner.mutation(api.prompts.save, { workspaceId: context.workspaceId, prompt: 'Who sells useful tools?', category: 'Buyer' });
  await owner.mutation(api.prompts.save, { workspaceId: context.workspaceId, prompt: 'What are the alternatives?' });
  await owner.mutation(api.prompts.save, { workspaceId: context.workspaceId, id: first.id, prompt: 'Who sells reliable tools?', isFavorite: true });
  const firstPage = await owner.query(api.prompts.list, { workspaceId: context.workspaceId, paginationOpts: { numItems: 1, cursor: null } });
  expect(firstPage.page).toHaveLength(1);
  expect(firstPage.isDone).toBe(false);
  const secondPage = await owner.query(api.prompts.list, { workspaceId: context.workspaceId, paginationOpts: { numItems: 1, cursor: firstPage.continueCursor } });
  expect(secondPage.page).toHaveLength(1);
  expect(new Set([...firstPage.page, ...secondPage.page].map((row) => row.id)).size).toBe(2);
  await expect(owner.mutation(api.prompts.remove, { workspaceId: foreignWorkspace, id: first.id })).rejects.toThrow('workspace_not_found');
  await t.run(async (ctx) => {
    const user = await ctx.db.query('users').withIndex('by_public_id', (q) => q.eq('publicId', context.userId)).unique();
    if (!user) throw new Error('missing_user');
    const member = await ctx.db.query('memberships').withIndex('by_user_id', (q) => q.eq('userId', user._id)).unique();
    if (!member) throw new Error('missing_membership');
    await ctx.db.patch(member._id, { role: 'viewer' });
  });
  await expect(owner.mutation(api.prompts.remove, { workspaceId: context.workspaceId, id: first.id })).rejects.toThrow('forbidden_role');
  expect((await owner.query(api.prompts.list, { workspaceId: context.workspaceId, paginationOpts: { numItems: 10, cursor: null } })).page).toHaveLength(2);
});

test('product validation rejects unsafe links and update cannot move an existing product', async () => {
  const { owner, context, foreignWorkspace } = await fixture();
  const args = { workspaceId: context.workspaceId, name: 'Aelo', description: null, website: 'https://example.test', keywords: ['measurement'] };
  const product = await owner.mutation(api.products.save, args);
  await expect(owner.mutation(api.products.save, { ...args, website: 'javascript:alert(1)' })).rejects.toThrow('invalid_website');
  await expect(owner.mutation(api.products.save, { ...args, website: 'not-a-url' })).rejects.toThrow('invalid_website');
  await expect(owner.mutation(api.products.save, { ...args, id: product.id, workspaceId: foreignWorkspace })).rejects.toThrow('workspace_not_found');
  await owner.mutation(api.products.remove, { workspaceId: context.workspaceId, id: product.id });
  expect((await owner.query(api.products.list, { workspaceId: context.workspaceId, paginationOpts: { numItems: 10, cursor: null } })).page).toEqual([]);
});

test('free workspace limit is enforced in the backend, not only in the route', async () => {
  const { owner } = await fixture();
  expect(await owner.mutation(api.workspaces.create, { name: 'Another brand', settings: { website: null, competitors: [] } })).toEqual({ status: 'denied', limit: 1 });
});
