import { expect, test } from 'vitest';
import { internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

type BrokenRun = 'missing' | 'empty_job' | 'complete_without_result' | 'all_failed_without_result' | 'queued';

async function exerciseBrokenRun(kind: BrokenRun) {
  const { t, context } = await fixture();
  const ids = await t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', context.workspaceId)).unique();
    const actor = await ctx.db.query('users').withIndex('by_normalized_email', q => q.eq('normalizedEmail', 'local-owner@example.test')).unique();
    if (!workspace || !actor) throw new Error('missing_fixture');
    const now = Date.now();
    const actionId = await ctx.db.insert('actions', {
      publicId: 'action-recovery', workspaceId: workspace._id, ownerId: actor._id, forumThreadId: null,
      actionType: 'other', title: 'Publish a source page', description: null, actionUrl: null,
      hypothesis: 'A citation gap can be addressed.', sourceUrl: null, priority: 'medium',
      targetPrompts: ['Which tracker should I use?'], targetEngines: ['gemini'], insightKey: null,
      status: 'completed', actionTakenAt: now, baselineSnapshot: {}, impactSnapshot: null,
      impactSummary: null, createdAt: now, updatedAt: now,
    });
    if (kind !== 'missing' && kind !== 'empty_job') {
      await ctx.db.insert('measurementRuns', {
        publicId: 'run-recovery', workspaceId: workspace._id, organizationId: workspace.organizationId,
        requestId: 'run-recovery', input: { prompt: 'Which tracker should I use?', brandName: 'Aelo', platforms: ['gemini'], samples: 4 },
        status: kind === 'queued' ? 'queued' : kind === 'all_failed_without_result' ? 'all_failed' : 'complete',
        result: null, workflowId: null, createdAt: now, updatedAt: now,
      });
    }
    const jobId = await ctx.db.insert('actionMeasurements', {
      publicId: 'job-recovery', actionId, workspaceId: workspace._id, actorId: actor._id,
      requestId: 'job-recovery', runIds: kind === 'empty_job' ? [] : [kind === 'missing' ? 'missing-run' : 'run-recovery'],
      baseline: {}, status: 'running', createdAt: now, updatedAt: now,
    });
    return { actionId, jobId };
  });
  await t.mutation(internal.actionMeasurements.finish, { id: ids.jobId });
  return t.run(async ctx => ({
    job: await ctx.db.get(ids.jobId),
    action: await ctx.db.get(ids.actionId),
    events: await ctx.db.query('actionEvents').withIndex('by_action_id_and_created_at', q => q.eq('actionId', ids.actionId)).take(10),
  }));
}

test.each(['missing', 'empty_job', 'complete_without_result'] as const)('%s evidence ends as untracked without an impact claim', async kind => {
  const { job, action, events } = await exerciseBrokenRun(kind);
  expect(job?.status).toBe('untracked');
  expect(action?.status).toBe('completed');
  expect(action?.impactSummary).toBeNull();
  expect(events).toHaveLength(0);
});

test('a terminal all-failed run ends the action job instead of polling forever', async () => {
  const { job, action } = await exerciseBrokenRun('all_failed_without_result');
  expect(job?.status).toBe('all_failed');
  expect(action?.status).toBe('completed');
});

test('a queued run still waits for real evidence', async () => {
  const { job, action } = await exerciseBrokenRun('queued');
  expect(job?.status).toBe('running');
  expect(action?.impactSummary).toBeNull();
});
