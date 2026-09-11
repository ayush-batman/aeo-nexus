import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, internalQuery } from './_generated/server';
import { requireTenant, requireWorkspace, requireRole, tenantQuery } from './lib/tenant';
import { nullableString } from './validators';
export const installContext = internalQuery({
  args: { workspaceId: v.string() }, returns: v.string(),
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx); requireRole(tenant, 'editor');
    const workspace = await requireWorkspace(ctx, tenant, args.workspaceId); return workspace.publicId;
  },
});
export const insertVerified = internalMutation({
  args: { workspaceId: v.string(), eventType: v.string(), referrer: nullableString, aiSource: v.string(), path: nullableString, metadata: v.any() }, returns: v.null(),
  handler: async (ctx, args) => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', args.workspaceId)).unique();
    if (!workspace) throw new Error('workspace_not_found');
    await ctx.db.insert('analyticsEvents', { publicId: crypto.randomUUID(), workspaceId: workspace._id,
      eventType: args.eventType, referrer: args.referrer, aiSource: args.aiSource, path: args.path, metadata: args.metadata, createdAt: Date.now() });
    return null;
  },
});
export const events = tenantQuery({
  args: { workspaceId: v.string(), since: v.number(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), workspace_id: v.string(), event_type: v.string(), referrer: nullableString,
    ai_source: nullableString, path: nullableString, metadata: v.any(), created_at: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('analyticsEvents').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id).gte('createdAt', args.since)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(500, args.paginationOpts.numItems) });
    return { page: result.page.map(e => ({ id: e.publicId, workspace_id: args.workspaceId, event_type: e.eventType, referrer: e.referrer,
      ai_source: e.aiSource, path: e.path, metadata: e.metadata, created_at: new Date(e.createdAt).toISOString() })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
