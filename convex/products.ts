import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { tenantMutation, tenantQuery, requireWorkspace, requireRole } from './lib/tenant';
import { newPublicId } from './lib/publicIds';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';

const product = v.object({ id: v.string(), workspace_id: v.string(), name: v.string(),
  description: v.union(v.string(), v.null()), website: v.union(v.string(), v.null()),
  keywords: v.array(v.string()), created_at: v.string() });

export const list = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(product), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('products').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id)).order('desc').paginate({ ...args.paginationOpts,
        numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: result.page.map((row) => ({ id: row.publicId, workspace_id: workspace.publicId,
      name: row.name, description: row.description, website: row.website, keywords: row.keywords,
      created_at: new Date(row.createdAt).toISOString() })),
      isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const save = tenantMutation({
  args: { workspaceId: v.string(), id: v.optional(v.string()), name: v.string(),
    description: v.union(v.string(), v.null()), website: v.union(v.string(), v.null()), keywords: v.array(v.string()) },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const name = args.name.trim();
    if (!name || name.length > 200 || (args.description?.length ?? 0) > 10000 ||
        args.keywords.length > 100 || args.keywords.some((word) => word.length > 200)) throw new Error('invalid_product');
    if (args.website) {
      let url: URL;
      try { url = new URL(args.website); } catch { throw new Error('invalid_website'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || args.website.length > 2048) throw new Error('invalid_website');
    }
    const existing = args.id ? await ctx.db.query('products').withIndex('by_public_id', (q) =>
      q.eq('publicId', args.id!)).unique() : null;
    if (args.id && (!existing || existing.workspaceId !== workspace._id)) throw new Error('product_not_found');
    const value = { name, description: args.description, website: args.website,
      keywords: args.keywords.map((word) => word.trim()).filter(Boolean), updatedAt: Date.now() };
    if (existing) { await ctx.db.patch(existing._id, value); return { id: existing.publicId }; }
    const publicId = newPublicId();
    await ctx.db.insert('products', { ...value, publicId, workspaceId: workspace._id,
      competitors: [], knowledgeBase: {}, createdAt: Date.now() });
    return { id: publicId };
  },
});

export const remove = tenantMutation({
  args: { workspaceId: v.string(), id: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('products').withIndex('by_public_id', (q) => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('product_not_found');
    // Preserve historical discussions; removing their optional product reference
    // is handled by the bounded cleanup job rather than deleting evidence.
    await ctx.db.delete(row._id);
    await ctx.scheduler.runAfter(0, internal.products.clearDeletedProductReferences, { productId: row._id });
    return null;
  },
});

export const clearDeletedProductReferences = internalMutation({
  args: { productId: v.id('products') }, returns: v.null(),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query('forumThreads').withIndex('by_product_id', (q) => q.eq('productId', args.productId)).take(100);
    for (const row of rows) await ctx.db.patch(row._id, { productId: null });
    if (rows.length === 100) await ctx.scheduler.runAfter(0, internal.products.clearDeletedProductReferences, args);
    return null;
  },
});
