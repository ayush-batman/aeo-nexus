import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { tenantMutation, tenantQuery, requireRole, requireWorkspace } from './lib/tenant';
import { actionRecord, serializeAction } from './lib/actionRecords';
import { beginMeasurement } from './measurements';
import { configuredEngines } from './apiWrites';
import { snapshotFromObservations } from '../lib/interventions';
import { compareVisibilitySnapshots } from '../lib/measurement/comparison';
import type { Doc } from './_generated/dataModel';
export const begin = tenantMutation({
  args: { workspaceId: v.string(), id: v.string(), requestId: v.string() }, returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const action = await ctx.db.query('actions').withIndex('by_public_id', q => q.eq('publicId', args.id)).unique();
    if (!action || action.workspaceId !== workspace._id) throw new Error('action_not_found');
    if (!args.requestId || args.requestId.length > 100) throw new Error('invalid_request_id');
    const duplicate = await ctx.db.query('actionMeasurements').withIndex('by_action_request', q => q.eq('actionId', action._id).eq('requestId', args.requestId)).unique();
    if (duplicate) return duplicate.publicId;
    const running = await ctx.db.query('actionMeasurements').withIndex('by_action_status', q => q.eq('actionId', action._id).eq('status', 'running')).first();
    if (running) return running.publicId;
    if (action.status !== 'completed' && action.status !== 'measured') throw new Error('invalid_action_transition');
    if (!action.targetPrompts.length || action.targetPrompts.length > 20) throw new Error('invalid_action_prompts');
    const available = configuredEngines().filter(engine => ctx.tenant.organization.plan !== 'free' || engine === 'gemini');
    const platforms = action.targetEngines.length ? action.targetEngines : available;
    if (!platforms.length || platforms.some(engine => !available.some(p => p === engine))) throw new Error('no_engines_available');
    const publicId = crypto.randomUUID();
    const runIds: string[] = [];
    for (const [index, prompt] of action.targetPrompts.entries()) {
      runIds.push(await beginMeasurement(ctx, ctx.tenant, workspace, `action:${publicId}:${index}`, {
        prompt, brandName: workspace.name, platforms, samples: 4, mode: 'standard',
        competitors: Array.isArray(workspace.settings?.competitors) ? workspace.settings.competitors : [],
        ...(typeof workspace.settings?.website === 'string' ? { brandDomain: workspace.settings.website } : {}),
      }, `action:${publicId}`));
    }
    const id = await ctx.db.insert('actionMeasurements', { publicId, actionId: action._id, workspaceId: workspace._id,
      actorId: ctx.tenant.user._id, requestId: args.requestId, runIds, baseline: action.baselineSnapshot,
      status: 'running', createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.scheduler.runAfter(60000, internal.actionMeasurements.finish, { id });
    return publicId;
  },
});
export const get = tenantQuery({
  args: { workspaceId: v.string(), id: v.string(), jobId: v.string() },
  returns: v.object({ status: v.string(), intervention: actionRecord, summary: v.any() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const job = await ctx.db.query('actionMeasurements').withIndex('by_public_id', q => q.eq('publicId', args.jobId)).unique();
    const action = job && await ctx.db.get(job.actionId);
    if (!job || job.workspaceId !== workspace._id || !action || action.publicId !== args.id) throw new Error('action_not_found');
    return { status: job.status, intervention: await serializeAction(ctx, action, workspace.publicId), summary: action.impactSummary };
  },
});
export const finish = internalMutation({
  args: { id: v.id('actionMeasurements') }, returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    if (!job || job.status !== 'running') return null;
    const action = await ctx.db.get(job.actionId), workspace = await ctx.db.get(job.workspaceId);
    if (!action || !workspace || action.workspaceId !== job.workspaceId) throw new Error('action_not_found');
    const runs = await Promise.all(job.runIds.map(id => ctx.db.query('measurementRuns').withIndex('by_public_id', q => q.eq('publicId', id)).unique()));
    if (runs.some(run => !run?.result)) { await ctx.scheduler.runAfter(60000, internal.actionMeasurements.finish, args); return null; }
    if (runs.every(run => run?.status === 'all_failed')) {
      await ctx.db.patch(job._id, { status: 'all_failed', updatedAt: Date.now() }); return null;
    }
    const scans: Doc<'scanMetrics'>[] = [];
    for (const run of runs) {
      if (!run || run.workspaceId !== job.workspaceId) throw new Error('measurement_not_found');
      scans.push(...await ctx.db.query('scanMetrics').withIndex('by_workspace_run', q => q.eq('workspaceId', job.workspaceId).eq('measurementRunId', run.publicId)).take(32));
    }
    const impact = snapshotFromObservations(scans.map(s => s.observation), action.targetPrompts);
    const summary = compareVisibilitySnapshots(job.baseline || {}, impact);
    await ctx.db.patch(action._id, { impactSnapshot: impact, impactSummary: summary, status: 'measured', updatedAt: Date.now() });
    await ctx.db.insert('actionEvents', { publicId: crypto.randomUUID(), actionId: action._id, workspaceId: job.workspaceId,
      actorId: job.actorId, eventType: 'measured', fromStatus: action.status, toStatus: 'measured', changes: { impact_summary: summary },
      idempotencyKey: `measured:${job.publicId}`, createdAt: Date.now() });
    await ctx.db.patch(job._id, { status: runs.every(run => run?.status === 'complete') ? 'complete' : 'partial', updatedAt: Date.now() });
    return null;
  },
});
