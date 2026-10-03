import { v } from 'convex/values';
import { tenantMutation, requireRole, requireWorkspace } from './lib/tenant';
import { newPublicId } from './lib/publicIds';

export const saveBrand = tenantMutation({
  args: { workspaceId: v.string(), brandName: v.string(), website: v.optional(v.string()),
    industry: v.optional(v.string()), description: v.optional(v.string()), targetAudience: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const name = args.brandName.trim();
    if (!name || name.length > 100 || (args.industry?.length ?? 0) > 200 ||
      (args.description?.length ?? 0) > 10000 || (args.targetAudience?.length ?? 0) > 2000) throw new Error('invalid_workspace_settings');
    if (args.website) {
      let url: URL;
      try { url = new URL(args.website); } catch { throw new Error('invalid_website'); }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || args.website.length > 2048) throw new Error('invalid_website');
    }
    const now = Date.now();
    const existing = await ctx.db.query('products').withIndex('by_workspace_id', (q) => q.eq('workspaceId', workspace._id)).first();
    const product = { name, website: args.website || null, description: args.description || null,
      keywords: [name.toLowerCase()], updatedAt: now };
    if (existing) await ctx.db.patch(existing._id, product);
    else await ctx.db.insert('products', { ...product, workspaceId: workspace._id, publicId: newPublicId(),
      competitors: [], knowledgeBase: {}, createdAt: now });
    await ctx.db.patch(workspace._id, { name, updatedAt: now, settings: {
      ...workspace.settings, website: args.website || null,
      industry: args.industry ?? workspace.settings?.industry ?? '',
      target_audience: args.targetAudience ?? workspace.settings?.target_audience ?? '',
    } });
    return null;
  },
});

export const complete = tenantMutation({
  args: { workspaceId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    await ctx.db.patch(ctx.tenant.user._id, { onboardingCompleted: true, updatedAt: Date.now() });
    return null;
  },
});
