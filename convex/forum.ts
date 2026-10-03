import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { requireRole, requireTenant, requireWorkspace, tenantMutation } from './lib/tenant';
import { forumDocument } from './records';
import type { MutationCtx } from './_generated/server';
import type { Doc } from './_generated/dataModel';
import { limits } from './lib/limits';
import { PLAN_LIMITS } from '../lib/config';

export const threadInput = v.object({ platform: v.string(), externalId: v.string(), url: v.string(), title: v.string(),
  text: v.optional(v.string()), subreddit: v.optional(v.string()), author: v.optional(v.string()),
  score: v.optional(v.number()), numComments: v.optional(v.number()), opportunityScore: v.optional(v.number()), externalCreatedAt: v.optional(v.number()) });

async function enforceThreadQuota(ctx: MutationCtx, organization: Doc<'organizations'>) {
  const limit = PLAN_LIMITS[organization.plan]?.threads ?? 20;
  if (limit === -1) return;
  const month = new Date(); const since = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1);
  const workspaces = await ctx.db.query('workspaces').withIndex('by_organization_id', q => q.eq('organizationId', organization._id)).take(201);
  if (workspaces.length > 200) throw new Error('usage_read_limit');
  let count = 0;
  for (const workspace of workspaces) {
    count += (await ctx.db.query('forumThreads').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id).gte('createdAt', since)).take(limit - count + 1)).length;
    if (count >= limit) throw new Error('thread_quota_exceeded');
  }
}
export const authorizeDiscovery = internalMutation({
  args: { workspaceId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx); requireRole(tenant, 'editor');
    await requireWorkspace(ctx, tenant, args.workspaceId);
    const allowed = await limits.limit(ctx, 'discovery', { key: tenant.organization.publicId });
    if (!allowed.ok) throw new Error('rate_limit_exceeded');
    return null;
  },
});
export const save = tenantMutation({
  args: { workspaceId: v.string(), thread: threadInput }, returns: forumDocument,
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const input = args.thread;
    let url: URL;
    try { url = new URL(input.url); } catch { throw new Error('invalid_thread_url'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || input.url.length > 2048 ||
      !input.title.trim() || input.title.length > 1000 || !input.externalId || input.externalId.length > 250 || !/^[a-z0-9_-]{1,50}$/i.test(input.platform) ||
      (input.text?.length ?? 0) > 30000 || (input.subreddit?.length ?? 0) > 200 || (input.author?.length ?? 0) > 200 ||
      [input.score, input.numComments, input.opportunityScore, input.externalCreatedAt].some(n => n !== undefined && !Number.isFinite(n))) throw new Error('invalid_thread');
    const existing = await ctx.db.query('forumThreads').withIndex('by_workspace_platform_external_id', q => q.eq('workspaceId', workspace._id).eq('platform', input.platform).eq('externalId', input.externalId)).unique();
    if (!existing) await enforceThreadQuota(ctx, ctx.tenant.organization);
    const now = Date.now();
    const value = { publicId: existing?.publicId ?? crypto.randomUUID(), workspaceId: workspace._id,
      productId: existing?.productId ?? null, platform: input.platform, externalId: input.externalId, url: url.toString(), title: input.title.trim(),
      text: input.text ?? existing?.text ?? null, subreddit: input.subreddit ?? existing?.subreddit ?? null,
      author: input.author ?? existing?.author ?? null, score: input.score ?? existing?.score ?? 0,
      numComments: input.numComments ?? existing?.numComments ?? 0, opportunityScore: Math.max(0, Math.min(100, input.opportunityScore ?? existing?.opportunityScore ?? 0)),
      scoreBreakdown: existing?.scoreBreakdown ?? {}, status: existing?.status ?? 'discovered', commentDraft: existing?.commentDraft ?? null,
      postedAt: existing?.postedAt ?? null, postedBy: existing?.postedBy ?? null, discoveredAt: existing?.discoveredAt ?? now,
      externalCreatedAt: input.externalCreatedAt ?? existing?.externalCreatedAt ?? null, createdAt: existing?.createdAt ?? now };
    const id = existing?._id ?? await ctx.db.insert('forumThreads', value);
    if (existing) await ctx.db.replace(id, value);
    await ctx.db.patch(workspace._id, { forumRevision: (workspace.forumRevision ?? 0) + 1 });
    return { ...value, _id: id, _creationTime: existing?._creationTime ?? now };
  },
});
export const update = tenantMutation({
  args: { workspaceId: v.string(), id: v.string(), status: v.optional(v.string()), commentDraft: v.optional(v.union(v.string(), v.null())) },
  returns: forumDocument,
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('forumThreads').withIndex('by_public_id', q => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('thread_not_found');
    if ((args.status !== undefined && !['discovered', 'queued', 'drafted', 'posted', 'skipped'].includes(args.status)) ||
      (args.commentDraft?.length ?? 0) > 30000) throw new Error('invalid_thread');
    const posted = args.status === 'posted' && row.status !== 'posted';
    const updates = { ...(args.status === undefined ? {} : { status: args.status }), ...(args.commentDraft === undefined ? {} : { commentDraft: args.commentDraft }),
      ...(posted ? { postedAt: Date.now(), postedBy: ctx.tenant.user.publicId } : {}) };
    await ctx.db.patch(row._id, updates);
    await ctx.db.patch(workspace._id, { forumRevision: (workspace.forumRevision ?? 0) + 1 });
    if (posted) {
      const insightKey = `forum-thread:${row.publicId}`;
      const existing = await ctx.db.query('actions').withIndex('by_workspace_id_and_insight_key', q => q.eq('workspaceId', workspace._id).eq('insightKey', insightKey)).unique();
      if (!existing) {
        // Selecting a buyer prompt is a user decision, not an inference from a
        // forum title. Capture a baseline when the user chooses tracked prompts.
        const targetPrompts: string[] = [];
        const baselineSnapshot = {};
        const actionId = await ctx.db.insert('actions', { publicId: crypto.randomUUID(), workspaceId: workspace._id,
          ownerId: ctx.tenant.user._id, forumThreadId: row._id, actionType: 'forum_reply', title: `Replied on ${row.platform}: ${row.title.slice(0, 120)}`,
          description: 'Created when this thread was marked posted. Choose a tracked buyer prompt before measuring impact.',
          actionUrl: row.url, hypothesis: 'A useful, disclosed contribution may earn relevant visibility; this has not been demonstrated.', sourceUrl: row.url,
          priority: 'medium', targetPrompts, targetEngines: [], insightKey, status: 'completed', actionTakenAt: Date.now(),
          baselineSnapshot, impactSnapshot: null, impactSummary: null, createdAt: Date.now(), updatedAt: Date.now() });
        await ctx.db.insert('actionEvents', { publicId: crypto.randomUUID(), actionId, workspaceId: workspace._id, actorId: ctx.tenant.user._id,
          eventType: 'created', fromStatus: null, toStatus: 'completed', changes: { forum_thread_id: row.publicId },
          idempotencyKey: insightKey, createdAt: Date.now() });
      }
    }
    return { ...row, ...updates };
  },
});
