import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { scanDocument } from './records';
import { legacyScan } from '../lib/convex/records';
import { evaluateAlerts, selectPreviousAlertCohort, type ScanData } from '../lib/alerts/evaluate';
import type { FunctionReturnType } from 'convex/server';
export const context = internalQuery({
  args: { runId: v.id('measurementRuns') },
  returns: v.object({ workspaceId: v.id('workspaces'), publicWorkspaceId: v.string(), publicRunId: v.string(),
    since: v.number(), before: v.number(), preferences: v.array(v.object({ type: v.string(), enabled: v.boolean() })), current: v.array(scanDocument) }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    const workspace = run && await ctx.db.get(run.workspaceId);
    if (!run?.result || !workspace) throw new Error('measurement_not_found');
    const preferences = await ctx.db.query('alertPreferences').withIndex('by_workspace_id_and_alert_type', q => q.eq('workspaceId', workspace._id)).take(30);
    const current = await ctx.db.query('scans').withIndex('by_workspace_id_and_measurement_run_id', q => q.eq('workspaceId', workspace._id).eq('measurementRunId', run.publicId)).take(32);
    return { workspaceId: workspace._id, publicWorkspaceId: workspace.publicId, publicRunId: run.publicId,
      since: run.createdAt - 30 * 86400_000, before: run.createdAt, preferences: preferences.map(p => ({ type: p.alertType, enabled: p.enabled })), current };
  },
});
export const history = internalQuery({
  args: { workspaceId: v.id('workspaces'), since: v.number(), before: v.number(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(scanDocument), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query('scans').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', args.workspaceId).gte('createdAt', args.since).lt('createdAt', args.before))
      .order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(5, Math.max(1, args.paginationOpts.numItems)) });
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const insert = internalMutation({
  args: { workspaceId: v.id('workspaces'), type: v.string(), title: v.string(), message: v.string(), dedupeKey: v.string(), metadata: v.any() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!await ctx.db.get(args.workspaceId)) throw new Error('workspace_not_found');
    const preference = await ctx.db.query('alertPreferences').withIndex('by_workspace_id_and_alert_type', q => q.eq('workspaceId', args.workspaceId).eq('alertType', args.type)).unique();
    if (preference?.enabled === false) return false;
    const existing = await ctx.db.query('notifications').withIndex('by_workspace_id_and_dedupe_key', q => q.eq('workspaceId', args.workspaceId).eq('dedupeKey', args.dedupeKey)).unique();
    if (existing) return false;
    await ctx.db.insert('notifications', { ...args, publicId: crypto.randomUUID(), read: false, createdAt: Date.now() }); return true;
  },
});
export const evaluate = internalAction({
  args: { runId: v.id('measurementRuns') }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const input = await ctx.runQuery(internal.measurementAlerts.context, args);
    const previous: ScanData[] = [];
    let cursor: string | null = null;
    do {
      const result: FunctionReturnType<typeof internal.measurementAlerts.history> = await ctx.runQuery(internal.measurementAlerts.history, {
        workspaceId: input.workspaceId, since: input.since, before: input.before, paginationOpts: { cursor, numItems: 100 } });
      previous.push(...result.page.filter(s => !s.failureCode && s.response.trim()).map(s => legacyScan(s, input.publicWorkspaceId)));
      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);
    const current = input.current.filter(s => !s.failureCode && s.response.trim()).map(s => legacyScan(s, input.publicWorkspaceId));
    const notifications = evaluateAlerts(input.publicWorkspaceId, current, selectPreviousAlertCohort(current, previous), input.publicRunId,
      previous, new Map(input.preferences.map(p => [p.type, p.enabled])));
    for (const notification of notifications) await ctx.runMutation(internal.measurementAlerts.insert, { workspaceId: input.workspaceId, ...notification });
    return null;
  },
});
