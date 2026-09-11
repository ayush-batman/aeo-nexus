import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';
test('experiments reject overlapping groups, keep results unmeasured and enforce access', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  const input = { workspaceId: context.workspaceId, name: 'Evidence test', testQuestions: ['buyer question'], controlQuestions: ['control question'] };
  await expect(owner.mutation(api.experiments.create, { ...input, controlQuestions: input.testQuestions })).rejects.toThrow('invalid_experiment');
  const experiment = await owner.mutation(api.experiments.create, input);
  expect(experiment).toMatchObject({ status: 'draft', baseline_data: null, result_data: null });
  await expect(owner.mutation(api.experiments.remove, { workspaceId: foreignWorkspace, id: experiment.id })).rejects.toThrow('workspace_not_found');
  await t.run(async ctx => { const member = await ctx.db.query('memberships').first(); await ctx.db.patch(member!._id, { role: 'viewer' }); });
  await expect(owner.mutation(api.experiments.remove, { workspaceId: context.workspaceId, id: experiment.id })).rejects.toThrow('forbidden_role');
});
