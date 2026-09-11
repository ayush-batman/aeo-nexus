import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { tenantQuery, type TenantContext } from './lib/tenant';
import { planValidator, roleValidator, nullableString } from './validators';
import type { Doc } from './_generated/dataModel';

function requireSuperAdmin(tenant: TenantContext) { if (!tenant.user.isSuperAdmin) throw new Error('forbidden_role'); }
const orgValue = v.object({ id: v.string(), name: v.string(), plan: planValidator, stripe_customer_id: nullableString,
  stripe_subscription_id: nullableString, razorpay_subscription_id: nullableString, created_at: v.string(), updated_at: v.string() });
const userValue = v.object({ id: v.string(), email: v.string(), full_name: nullableString, avatar_url: nullableString, org_id: v.string(),
  role: roleValidator, is_super_admin: v.boolean(), created_at: v.string() });
const orgRecord = (row: Doc<'organizations'>) => ({ id: row.publicId, name: row.name, plan: row.plan, stripe_customer_id: row.stripeCustomerId,
  stripe_subscription_id: row.stripeSubscriptionId, razorpay_subscription_id: row.razorpaySubscriptionId, created_at: new Date(row.createdAt).toISOString(), updated_at: new Date(row.updatedAt).toISOString() });
const userRecord = (row: Doc<'users'>, orgId: string, role: Doc<'memberships'>['role']) => ({ id: row.publicId, email: row.email, full_name: row.fullName,
  avatar_url: row.avatarUrl, org_id: orgId, role, is_super_admin: row.isSuperAdmin, created_at: new Date(row.createdAt).toISOString() });
export const profile = tenantQuery({ args: {}, returns: userValue, handler: async ctx => userRecord(ctx.tenant.user, ctx.tenant.organization.publicId, ctx.tenant.role) });
export const organizations = tenantQuery({
  args: { paginationOpts: paginationOptsValidator }, returns: v.object({ page: v.array(orgValue), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    requireSuperAdmin(ctx.tenant);
    const page = await ctx.db.query('organizations').order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    return { page: page.page.map(orgRecord), isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
export const organization = tenantQuery({ args: { orgId: v.string() }, returns: v.union(orgValue, v.null()), handler: async (ctx, args) => {
  requireSuperAdmin(ctx.tenant);
  const row = await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', args.orgId)).unique();
  return row ? orgRecord(row) : null;
} });
export const members = tenantQuery({
  args: { orgId: v.optional(v.string()), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(userValue), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    requireSuperAdmin(ctx.tenant);
    const org = args.orgId ? await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', args.orgId!)).unique() : null;
    if (args.orgId && !org) throw new Error('organization_not_found');
    const source = org ? ctx.db.query('memberships').withIndex('by_organization_id', q => q.eq('organizationId', org._id)) : ctx.db.query('memberships');
    const page = await source.paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    const rows = await Promise.all(page.page.map(async member => {
      const [user, organization] = await Promise.all([ctx.db.get(member.userId), org ?? ctx.db.get(member.organizationId)]);
      if (!user || !organization) throw new Error('membership_user_missing');
      return userRecord(user, organization.publicId, member.role);
    }));
    return { page: rows, isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
export const workspaces = tenantQuery({
  args: { orgId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), org_id: v.string(), name: v.string(), created_at: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    requireSuperAdmin(ctx.tenant);
    const org = await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', args.orgId)).unique();
    if (!org) throw new Error('organization_not_found');
    const page = await ctx.db.query('workspaces').withIndex('by_organization_id', q => q.eq('organizationId', org._id))
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    return { page: page.page.map(row => ({ id: row.publicId, org_id: args.orgId, name: row.name, created_at: new Date(row.createdAt).toISOString() })), isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
export const scanUsage = tenantQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ orgId: v.string(), count: v.number(), lastActive: v.number() })), total: v.number(), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    requireSuperAdmin(ctx.tenant);
    // Paginated admin-only aggregate: no customer prompts or responses cross this boundary.
    const result = await ctx.db.query('scans').paginate({ ...args.paginationOpts, numItems: Math.min(50, args.paginationOpts.numItems) });
    const groups = new Map<string, { orgId: string; count: number; lastActive: number }>();
    for (const row of result.page) {
      const workspace = await ctx.db.get(row.workspaceId);
      const org = workspace ? await ctx.db.get(workspace.organizationId) : null;
      if (!org) throw new Error('scan_workspace_missing');
      const group = groups.get(org.publicId) ?? { orgId: org.publicId, count: 0, lastActive: 0 };
      group.count++; group.lastActive = Math.max(group.lastActive, row.createdAt); groups.set(org.publicId, group);
    }
    return { page: [...groups.values()], total: result.page.length, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
