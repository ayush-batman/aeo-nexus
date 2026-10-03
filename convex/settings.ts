import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { tenantMutation, tenantQuery, requireRole, requireWorkspace } from './lib/tenant';
import { planValidator, roleValidator } from './validators';

export const profile = tenantQuery({
  args: {}, returns: v.object({ id: v.string(), email: v.string(), full_name: v.union(v.string(), v.null()),
    role: roleValidator, org_id: v.string(), is_super_admin: v.boolean() }),
  handler: async ctx => ({ id: ctx.tenant.user.publicId, email: ctx.tenant.user.email,
    full_name: ctx.tenant.user.fullName, role: ctx.tenant.role, org_id: ctx.tenant.organization.publicId,
    is_super_admin: ctx.tenant.user.isSuperAdmin }),
});
export const organization = tenantQuery({
  args: { orgId: v.string() }, returns: v.object({ id: v.string(), name: v.string(), plan: planValidator }),
  handler: async (ctx, { orgId }) => {
    if (ctx.tenant.organization.publicId !== orgId) throw new Error('forbidden_role');
    return { id: orgId, name: ctx.tenant.organization.name, plan: ctx.tenant.organization.plan };
  },
});
export const members = tenantQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), full_name: v.union(v.string(), v.null()), email: v.string(), role: roleValidator })),
    isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query('memberships').withIndex('by_organization_id', q => q.eq('organizationId', ctx.tenant.organization._id))
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    const page = await Promise.all(result.page.map(async membership => {
      const user = await ctx.db.get(membership.userId);
      if (!user) throw new Error('membership_user_missing');
      return { id: user.publicId, full_name: user.fullName, email: user.email, role: membership.role };
    }));
    return { page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const saveProfile = tenantMutation({
  args: { fullName: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    if (!args.fullName.trim() || args.fullName.length > 200) throw new Error('invalid_profile');
    await ctx.db.patch(ctx.tenant.user._id, { fullName: args.fullName.trim(), updatedAt: Date.now() });
    return null;
  },
});
export const saveWorkspace = tenantMutation({
  args: { workspaceId: v.string(), name: v.optional(v.string()), competitors: v.optional(v.array(v.string())) }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'admin');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    if (args.name !== undefined && (!args.name.trim() || args.name.length > 200)) throw new Error('invalid_workspace');
    if (args.competitors && (args.competitors.length > 20 || args.competitors.some(value => !value.trim() || value.length > 200))) throw new Error('invalid_workspace');
    const settings = workspace.settings && typeof workspace.settings === 'object' && !Array.isArray(workspace.settings) ? workspace.settings : {};
    await ctx.db.patch(workspace._id, { ...(args.name === undefined ? {} : { name: args.name.trim() }),
      ...(args.competitors === undefined ? {} : { settings: { ...settings, competitors: [...new Set(args.competitors.map(value => value.trim()))] } }), updatedAt: Date.now() });
    return null;
  },
});
