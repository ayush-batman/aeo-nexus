import { expect, test } from 'vitest';
import { internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

test('scheduled scans stop waiting for missing or terminal receipts but keep waiting for live runs', async () => {
  const { t, context } = await fixture();
  const now = Date.now();
  const ids = await t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique();
    if (!workspace) throw new Error('missing_test_workspace');
    const schedule = (runId: string) => ctx.db.insert('scheduledScans', {
      publicId: crypto.randomUUID(), workspaceId: workspace._id, prompt: 'Who measures AI visibility?',
      platforms: ['gemini'], competitors: [], frequency: 'weekly', lastRunAt: now,
      nextRunAt: now + 7 * 86400_000, status: 'active', claimToken: null, claimExpiresAt: null,
      lastRunStatus: `running:${runId}`, createdAt: now, updatedAt: now,
    });
    const input = { prompt: 'Who measures AI visibility?', brandName: 'Aelo', platforms: ['gemini' as const], samples: 4 };
    await ctx.db.insert('measurementRuns', { publicId: 'terminal-run', workspaceId: workspace._id,
      organizationId: workspace.organizationId, requestId: 'terminal-request', input, status: 'all_failed',
      result: null, workflowId: null, createdAt: now, updatedAt: now });
    await ctx.db.insert('measurementRuns', { publicId: 'pending-run', workspaceId: workspace._id,
      organizationId: workspace.organizationId, requestId: 'pending-request', input, status: 'running',
      result: null, workflowId: null, createdAt: now, updatedAt: now });
    return { missing: await schedule('missing-run'), terminal: await schedule('terminal-run'), pending: await schedule('pending-run') };
  });

  await t.mutation(internal.scheduled.finish, { id: ids.missing, runId: 'missing-run' });
  await t.mutation(internal.scheduled.finish, { id: ids.terminal, runId: 'terminal-run' });
  await t.mutation(internal.scheduled.finish, { id: ids.pending, runId: 'pending-run' });
  const state = await t.run(async ctx => ({
    missing: await ctx.db.get(ids.missing), terminal: await ctx.db.get(ids.terminal), pending: await ctx.db.get(ids.pending),
    scheduled: await ctx.db.system.query('_scheduled_functions').take(20),
  }));
  expect(state.missing?.lastRunStatus).toBe('untracked');
  expect(state.terminal?.lastRunStatus).toBe('untracked');
  expect(state.pending?.lastRunStatus).toBe('running:pending-run');
  expect(state.scheduled.filter(item => item.name === 'scheduled:finish')).toHaveLength(1);
});

test('a schedule with no workspace pauses instead of blocking every dispatch', async () => {
  const { t, context } = await fixture();
  const dueAt = Date.now();
  const scheduleId = await t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique();
    if (!workspace) throw new Error('missing_test_workspace');
    const id = await ctx.db.insert('scheduledScans', { publicId: crypto.randomUUID(), workspaceId: workspace._id,
      prompt: 'Who measures AI visibility?', platforms: ['gemini'], competitors: [], frequency: 'weekly',
      lastRunAt: null, nextRunAt: dueAt, status: 'active', claimToken: null, claimExpiresAt: null,
      lastRunStatus: null, createdAt: dueAt, updatedAt: dueAt });
    // This deletion is confined to the synthetic, in-memory test database.
    await ctx.db.delete(workspace._id);
    return id;
  });
  await t.mutation(internal.scheduled.runOne, { id: scheduleId, dueAt });
  const schedule = await t.run(ctx => ctx.db.get(scheduleId));
  expect(schedule).toMatchObject({ status: 'paused', lastRunStatus: 'skipped_workspace_missing' });
  expect(await t.mutation(internal.scheduled.dispatch, {})).toBe(0);
});
