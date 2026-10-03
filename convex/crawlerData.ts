import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { internalQuery } from './_generated/server';
import { requireTenant, requireWorkspace } from './lib/tenant';
import { requireKey } from './apiKeys';

const identity = { workspaceId: v.string(), keyId: v.optional(v.string()) };
export const workspace = internalQuery({
  args: identity, returns: v.object({ website: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const workspace = args.keyId ? (await requireKey(ctx, args.keyId, 'read')).workspace :
      await requireWorkspace(ctx, await requireTenant(ctx), args.workspaceId);
    if (workspace.publicId !== args.workspaceId) throw new Error('workspace_not_found');
    return { website: typeof workspace.settings?.website === 'string' ? workspace.settings.website : null };
  },
});
export const trafficPage = internalQuery({
  args: { ...identity, since: v.number(), paginationOpts: paginationOptsValidator },
  returns: v.object({ sources: v.array(v.string()), totalEvents: v.number(), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const workspace = args.keyId ? (await requireKey(ctx, args.keyId, 'read')).workspace :
      await requireWorkspace(ctx, await requireTenant(ctx), args.workspaceId);
    if (workspace.publicId !== args.workspaceId) throw new Error('workspace_not_found');
    const page = await ctx.db.query('analyticsEvents').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id).gte('createdAt', args.since)).paginate({ ...args.paginationOpts,
        numItems: Math.min(1000, Math.max(1, args.paginationOpts.numItems)) });
    return { sources: page.page.flatMap((row) => row.aiSource ? [row.aiSource] : []), totalEvents: page.page.length,
      continueCursor: page.continueCursor, isDone: page.isDone };
  },
});
