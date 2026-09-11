import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import schema from './schema';
import { tenantQuery, requireWorkspace } from './lib/tenant';
import { engineValidator } from './validators';

// Reuse the full schema validators so stored evidence crosses this boundary
// without erasing provenance or weakening its type checks.
export const scanDocument = v.object({ ...schema.tables.scans.validator.fields,
  _id: v.id('scans'), _creationTime: v.number() });
export const forumDocument = v.object({ ...schema.tables.forumThreads.validator.fields,
  _id: v.id('forumThreads'), _creationTime: v.number() });
export const contentDocument = v.object({ ...schema.tables.contentAnalyses.validator.fields,
  _id: v.id('contentAnalyses'), _creationTime: v.number() });

export const scans = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator,
    platform: v.optional(engineValidator), since: v.optional(v.number()), before: v.optional(v.number()) },
  returns: v.object({ page: v.array(scanDocument), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const source = args.platform
      ? ctx.db.query('scans').withIndex('by_workspace_platform_created_at', (q) =>
          q.eq('workspaceId', workspace._id).eq('platform', args.platform!).gte('createdAt', args.since ?? 0).lt('createdAt', args.before ?? Number.MAX_SAFE_INTEGER))
      : ctx.db.query('scans').withIndex('by_workspace_id_and_created_at', (q) =>
          q.eq('workspaceId', workspace._id).gte('createdAt', args.since ?? 0).lt('createdAt', args.before ?? Number.MAX_SAFE_INTEGER));
    const result = await source.order('desc').paginate({ ...args.paginationOpts,
      numItems: Math.min(5, Math.max(1, args.paginationOpts.numItems)) });
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const threads = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator,
    status: v.optional(v.string()), platform: v.optional(v.string()), minScore: v.optional(v.number()) },
  returns: v.object({ page: v.array(forumDocument), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    // Page the indexed score range before optional filters: rare matches must
    // not turn into an unbounded scan inside a single function.
    const result = await ctx.db.query('forumThreads').withIndex('by_workspace_opportunity', (q) =>
      q.eq('workspaceId', workspace._id).gte('opportunityScore', args.minScore ?? 0)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    const statuses = args.status?.split(',');
    return { page: result.page.filter((row) => (!statuses || statuses.includes(row.status)) &&
      (!args.platform || row.platform === args.platform)), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const content = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(contentDocument), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('contentAnalyses').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id)).order('desc').paginate({ ...args.paginationOpts,
        numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
