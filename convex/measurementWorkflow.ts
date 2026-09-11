import { v } from 'convex/values';
import { WorkflowManager, vWorkflowId } from '@convex-dev/workflow';
import { vResultValidator } from '@convex-dev/workpool';
import { components, internal } from './_generated/api';
import { internalMutation } from './_generated/server';

const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: { maxParallelism: 4, retryActionsByDefault: false },
});

export const run = workflow.define({ args: { runId: v.id('measurementRuns') }, returns: v.null() })
  .handler(async (step, args): Promise<null> => {
    const { input } = await step.runQuery(internal.measurements.executionInput, args);
    const sampleJobs: Array<Promise<unknown>> = [];
    for (let sampleNumber = 1; sampleNumber <= input.samples; sampleNumber++) {
      for (const engine of input.platforms) {
        sampleJobs.push((async () => {
        try {
          await step.runAction(internal.measurementActions.sample, { ...args, sampleNumber, engine }, { retry: false });
        } catch {
          // Do not selectively replace failed observations with new answers.
          await step.runMutation(internal.measurements.finishSample, { ...args, engine, sampleNumber,
            result: null, error: 'provider_interrupted' });
        }
        })());
      }
    }
    // Workpool caps provider concurrency at four. Queue every independent
    // sample together so a one-engine, four-sample scan needs one provider wave.
    await Promise.all(sampleJobs);
    await step.runAction(internal.measurementActions.finalize, args, { retry: true });
    return null;
  });

export const onComplete = internalMutation({
  args: { workflowId: vWorkflowId, result: vResultValidator, context: v.object({ runId: v.id('measurementRuns') }) },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const run = await ctx.db.get(args.context.runId);
    if (!run || run.result) return null;
    const slots = await ctx.db.query('measurementSamples').withIndex('by_run', (q) => q.eq('runId', run._id)).take(32);
    for (const slot of slots) if (slot.status === 'pending' || slot.status === 'running') {
      await ctx.db.patch(slot._id, { status: 'failed', error: 'workflow_interrupted', updatedAt: Date.now() });
    }
    await ctx.scheduler.runAfter(0, internal.measurementActions.finalize, { runId: run._id });
    return null;
  },
});
