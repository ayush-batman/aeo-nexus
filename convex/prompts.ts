import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { newPublicId } from './lib/publicIds';
import { requireRole, requireWorkspace, tenantMutation, tenantQuery } from './lib/tenant';

const promptValidator = v.object({ id: v.string(), workspace_id: v.string(), prompt: v.string(),
  category: v.union(v.string(), v.null()), is_favorite: v.boolean(), ai_generated: v.boolean(),
  metadata: v.any(), created_at: v.string() });

export const list = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(promptValidator), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const rows = await ctx.db.query('prompts').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id)).order('desc').paginate({ ...args.paginationOpts,
        numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: rows.page.map((row) => ({ id: row.publicId, workspace_id: workspace.publicId,
      prompt: row.prompt, category: row.category, is_favorite: row.isFavorite,
      ai_generated: row.aiGenerated, metadata: row.metadata, created_at: new Date(row.createdAt).toISOString() })),
      isDone: rows.isDone, continueCursor: rows.continueCursor };
  },
});

export const save = tenantMutation({
  args: { workspaceId: v.string(), id: v.optional(v.string()), prompt: v.string(),
    category: v.optional(v.string()), isFavorite: v.optional(v.boolean()), aiGenerated: v.optional(v.boolean()) },
  returns: promptValidator,
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const text = args.prompt.trim();
    if (!text || text.length > 2000 || (args.category?.length ?? 0) > 100) throw new Error('invalid_prompt');
    const existing = args.id ? await ctx.db.query('prompts').withIndex('by_public_id', (q) => q.eq('publicId', args.id!)).unique() : null;
    if (args.id && (!existing || existing.workspaceId !== workspace._id)) throw new Error('prompt_not_found');
    const value = { publicId: existing?.publicId ?? newPublicId(), workspaceId: workspace._id,
      prompt: text, category: args.category ?? existing?.category ?? null,
      isFavorite: args.isFavorite ?? existing?.isFavorite ?? false,
      aiGenerated: args.aiGenerated ?? existing?.aiGenerated ?? false,
      metadata: existing?.metadata ?? {}, createdAt: existing?.createdAt ?? Date.now() };
    if (existing) await ctx.db.replace(existing._id, value);
    else await ctx.db.insert('prompts', value);
    return { id: value.publicId, workspace_id: workspace.publicId, prompt: value.prompt,
      category: value.category, is_favorite: value.isFavorite, ai_generated: value.aiGenerated,
      metadata: value.metadata, created_at: new Date(value.createdAt).toISOString() };
  },
});

export const remove = tenantMutation({
  args: { workspaceId: v.string(), id: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('prompts').withIndex('by_public_id', (q) => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('prompt_not_found');
    await ctx.db.delete(row._id);
    return null;
  },
});
