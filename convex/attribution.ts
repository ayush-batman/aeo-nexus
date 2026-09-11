import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { tenantQuery, requireWorkspace } from './lib/tenant';
import { ATTRIBUTION_SOURCES } from '../lib/attribution';
const response = v.object({ source: v.string(), timestamp: v.string(), customSource: v.union(v.string(), v.null()) });
export const legacy = tenantQuery({ args: { workspaceId: v.string() }, returns: v.array(response), handler: async (ctx, args) => {
  const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
  const rows: unknown = workspace.settings?.attribution_responses;
  if (!Array.isArray(rows)) return [];
  return rows.slice(-1000).flatMap((row: unknown) => {
    if (!row || typeof row !== 'object' || !('source' in row) || typeof row.source !== 'string' || !ATTRIBUTION_SOURCES.includes(row.source) ||
      !('timestamp' in row) || typeof row.timestamp !== 'string' || !Number.isFinite(Date.parse(row.timestamp))) return [];
    return [{ source: row.source, timestamp: new Date(row.timestamp).toISOString(), customSource: 'customSource' in row && typeof row.customSource === 'string' ? row.customSource : null }];
  });
} });
export const responses = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(response), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('analyticsEvents').withIndex('by_workspace_event_created', q => q.eq('workspaceId', workspace._id).eq('eventType', 'attribution_survey'))
      .order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    return { page: result.page.flatMap(row => typeof row.metadata?.source === 'string' && ATTRIBUTION_SOURCES.includes(row.metadata.source) ? [{
      source: row.metadata.source, customSource: typeof row.metadata.customSource === 'string' ? row.metadata.customSource : null,
      timestamp: new Date(row.createdAt).toISOString(),
    }] : []), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
