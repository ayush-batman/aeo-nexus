import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { beginMeasurement } from './measurements';
import { configuredEngines } from './apiWrites';

export function nextScheduledTime(frequency: 'daily' | 'weekly' | 'monthly', now: number) {
  const next = new Date(now);
  if (frequency === 'monthly') {
    const day = next.getUTCDate();
    next.setUTCDate(1); next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  } else next.setUTCDate(next.getUTCDate() + (frequency === 'weekly' ? 7 : 1));
  return next.getTime();
}
export const dispatch = internalMutation({
  args: {}, returns: v.number(),
  handler: async (ctx) => {
    const due = await ctx.db.query('scheduledScans').withIndex('by_status_and_next_run_at', q => q.eq('status', 'active').lte('nextRunAt', Date.now())).take(20);
    for (const schedule of due) await ctx.scheduler.runAfter(0, internal.scheduled.runOne, { id: schedule._id, dueAt: schedule.nextRunAt });
    return due.length;
  },
});
export const runOne = internalMutation({
  args: { id: v.id('scheduledScans'), dueAt: v.number() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const schedule = await ctx.db.get(args.id);
    if (!schedule || schedule.status !== 'active' || schedule.nextRunAt !== args.dueAt || schedule.nextRunAt > Date.now()) return null;
    const workspace = await ctx.db.get(schedule.workspaceId);
    const organization = workspace && await ctx.db.get(workspace.organizationId);
    if (!workspace || !organization) throw new Error('schedule_workspace_missing');
    const membership = await ctx.db.query('memberships').withIndex('by_organization_role', q => q.eq('organizationId', organization._id).eq('role', 'owner')).first()
      ?? await ctx.db.query('memberships').withIndex('by_organization_role', q => q.eq('organizationId', organization._id).eq('role', 'admin')).first();
    const user = membership && await ctx.db.get(membership.userId);
    const now = Date.now();
    const finish = (lastRunStatus: string) => ctx.db.patch(schedule._id, { lastRunAt: now, nextRunAt: nextScheduledTime(schedule.frequency, now),
      lastRunStatus, claimToken: null, claimExpiresAt: null, updatedAt: now });
    if (!membership || !user) { await finish('skipped_no_authorized_owner'); return null; }
    const configured = configuredEngines();
    // Do not silently change the engine cohort on a scheduled comparison.
    if (!schedule.platforms.length || schedule.platforms.some(engine => !configured.some(available => available === engine) || (organization.plan === 'free' && engine !== 'gemini'))) {
      await finish('skipped_engine_unavailable_or_not_entitled'); return null;
    }
    if (organization.plan === 'free') {
      const used = await ctx.db.query('scanQuotaReservations').withIndex('by_organization_id_and_created_at', q => q.eq('organizationId', organization._id).gte('createdAt', now - 7 * 86400_000)).take(4);
      if (used.reduce((sum, row) => sum + row.units, 0) >= 3) { await finish('skipped_limit_reached'); return null; }
    }
    const runId = await beginMeasurement(ctx, { user, membership, organization, role: membership.role }, workspace,
      `schedule:${schedule.publicId}:${args.dueAt}`, { prompt: schedule.prompt, brandName: workspace.name,
        competitors: schedule.competitors, platforms: schedule.platforms, samples: 4, mode: 'standard',
        ...(typeof workspace.settings?.website === 'string' ? { brandDomain: workspace.settings.website } : {}) });
    await finish(`running:${runId}`);
    await ctx.scheduler.runAfter(60000, internal.scheduled.finish, { id: schedule._id, runId });
    return null;
  },
});
export const finish = internalMutation({
  args: { id: v.id('scheduledScans'), runId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.id);
    if (!schedule || schedule.lastRunStatus !== `running:${args.runId}`) return null;
    const run = await ctx.db.query('measurementRuns').withIndex('by_public_id', q => q.eq('publicId', args.runId)).unique();
    if (!run || run.workspaceId !== schedule.workspaceId) throw new Error('measurement_not_found');
    if (!run.result) { await ctx.scheduler.runAfter(60000, internal.scheduled.finish, args); return null; }
    await ctx.db.patch(schedule._id, { lastRunStatus: run.result.status, updatedAt: Date.now() }); return null;
  },
});

export const reconcileInitialJobs = internalMutation({
  args: {}, returns: v.number(),
  handler: async (ctx) => {
    const queued = await ctx.db.query('measurementJobs').withIndex('by_status_and_available_at', q => q.eq('status', 'queued').lte('availableAt', Date.now())).take(20);
    for (const job of queued) await ctx.db.patch(job._id, { status: 'skipped', lastError: 'Buyer prompts are required. Start the onboarding measurement to continue.', updatedAt: Date.now() });
    const running = await ctx.db.query('measurementJobs').withIndex('by_status_and_available_at', q => q.eq('status', 'running')).take(20);
    for (const job of running) {
      const packetId = typeof job.result?.decision_packet_id === 'string' ? job.result.decision_packet_id : null;
      if (!packetId) {
        await ctx.db.patch(job._id, { status: 'skipped', lastError: 'The old job has no resumable measurement. Start a new onboarding scan.', updatedAt: Date.now(), completedAt: Date.now() });
        continue;
      }
      const packet = await ctx.db.query('decisionPackets').withIndex('by_public_id', q => q.eq('publicId', packetId)).unique();
      if (!packet || packet.workspaceId !== job.workspaceId || !packet.measurementRunIds?.length) continue;
      const runs = await Promise.all(packet.measurementRunIds.map(id => ctx.db.query('measurementRuns').withIndex('by_public_id', q => q.eq('publicId', id)).unique()));
      if (runs.some(run => !run?.result)) continue;
      const status = runs.every(run => run?.status === 'all_failed') ? 'all_failed' as const : runs.every(run => run?.status === 'complete') ? 'complete' as const : 'partial' as const;
      await ctx.db.patch(packet._id, { status });
      await ctx.db.patch(job._id, { status: status === 'complete' ? 'succeeded' : status === 'all_failed' ? 'failed' : 'partial', completedAt: Date.now(), updatedAt: Date.now() });
      if (status !== 'all_failed' && packet.createdBy) {
        await ctx.scheduler.runAfter(0, internal.mailActions.firstResults, { packetId: packet._id });
      }
    }
    return queued.length + running.length;
  },
});
