import { v } from 'convex/values';
import { tenantQuery, requireWorkspace } from './lib/tenant';

/** Bounded live heads: clients refresh their paginated views, never append raw database rows. */
export const head = tenantQuery({
  args: { workspaceId: v.string() }, returns: v.string(),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const [runs, scans, threads] = await Promise.all([
      ctx.db.query('measurementRuns').withIndex('by_workspace_created_at', q => q.eq('workspaceId', workspace._id)).order('desc').take(20),
      ctx.db.query('scans').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc').take(1),
      ctx.db.query('forumThreads').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc').take(50),
    ]);
    return JSON.stringify({ forumRevision: workspace.forumRevision ?? 0, runs: runs.map(r => [r.publicId, r.status, r.updatedAt]),
      scans: scans.map(s => s.publicId), threads: threads.map(t => [t.publicId, t.status, t.opportunityScore]) });
  },
});
