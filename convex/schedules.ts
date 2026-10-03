import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Doc } from './_generated/dataModel';
import { tenantMutation, tenantQuery, requireRole, requireWorkspace } from './lib/tenant';
import { newPublicId } from './lib/publicIds';
import { engineValidator } from './validators';

const frequency = v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'));
const status = v.union(v.literal('active'), v.literal('paused'));
const schedule = v.object({ id: v.string(), workspace_id: v.string(), prompt: v.string(),
  platforms: v.array(v.string()), competitors: v.array(v.string()), frequency, status,
  last_run_at: v.union(v.string(), v.null()), next_run_at: v.string(), created_at: v.string(), updated_at: v.string() });
const serialize = (row: Doc<'scheduledScans'>, workspaceId: string) => ({ id: row.publicId,
  workspace_id: workspaceId, prompt: row.prompt, platforms: row.platforms, competitors: row.competitors,
  frequency: row.frequency, status: row.status, last_run_at: row.lastRunAt === null ? null : new Date(row.lastRunAt).toISOString(),
  next_run_at: new Date(row.nextRunAt).toISOString(), created_at: new Date(row.createdAt).toISOString(), updated_at: new Date(row.updatedAt).toISOString() });

export const list = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(schedule), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const page = await ctx.db.query('scheduledScans').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id)).order('desc').paginate({ ...args.paginationOpts,
        numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: page.page.map((row) => serialize(row, workspace.publicId)), isDone: page.isDone, continueCursor: page.continueCursor };
  },
});

export const save = tenantMutation({
  args: { workspaceId: v.string(), id: v.optional(v.string()), prompt: v.optional(v.string()),
    platforms: v.optional(v.array(engineValidator)), competitors: v.optional(v.array(v.string())),
    frequency: v.optional(frequency), status: v.optional(status) },
  returns: schedule,
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const existing = args.id ? await ctx.db.query('scheduledScans').withIndex('by_public_id', (q) => q.eq('publicId', args.id!)).unique() : null;
    if (args.id && (!existing || existing.workspaceId !== workspace._id)) throw new Error('schedule_not_found');
    const prompt = (args.prompt ?? existing?.prompt ?? '').trim();
    const platforms = [...new Set(args.platforms ?? existing?.platforms ?? [])];
    const competitors = args.competitors ?? existing?.competitors ?? [];
    if (!prompt || prompt.length > 2000 || !platforms.length || competitors.length > 20 ||
      competitors.some((value) => !value.trim() || value.length > 100)) throw new Error('invalid_schedule');
    const allowed = ctx.tenant.organization.plan === 'free' ? ['gemini'] : ['chatgpt', 'gemini', 'claude', 'perplexity'];
    if (platforms.some((platform) => !allowed.includes(platform))) throw new Error('engine_not_entitled');
    const now = Date.now();
    const value = { publicId: existing?.publicId ?? newPublicId(), workspaceId: workspace._id,
      prompt, platforms, competitors, frequency: args.frequency ?? existing?.frequency ?? 'weekly',
      status: args.status ?? existing?.status ?? 'active', lastRunAt: existing?.lastRunAt ?? null,
      nextRunAt: existing?.nextRunAt ?? now, claimToken: existing?.claimToken ?? null,
      claimExpiresAt: existing?.claimExpiresAt ?? null, lastRunStatus: existing?.lastRunStatus ?? null,
      createdAt: existing?.createdAt ?? now, updatedAt: now };
    const id = existing?._id ?? await ctx.db.insert('scheduledScans', value);
    if (existing) await ctx.db.replace(id, value);
    return serialize({ ...value, _id: id, _creationTime: existing?._creationTime ?? now }, workspace.publicId);
  },
});

export const remove = tenantMutation({
  args: { workspaceId: v.string(), id: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('scheduledScans').withIndex('by_public_id', (q) => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('schedule_not_found');
    await ctx.db.delete(row._id);
    return null;
  },
});
