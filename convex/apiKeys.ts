import { v } from 'convex/values';
import { internalMutation, internalQuery, type QueryCtx, type MutationCtx } from './_generated/server';
import { requireTenant, requireRole, requireWorkspace, tenantMutation, tenantQuery, type TenantContext } from './lib/tenant';
import { newPublicId } from './lib/publicIds';
import { roleValidator } from './validators';

const keySummary = v.object({ id: v.string(), name: v.string(), key_prefix: v.string(), scopes: v.array(v.string()),
  last_used_at: v.union(v.string(), v.null()), created_at: v.string(), revoked_at: v.union(v.string(), v.null()) });
const contextValidator = v.object({ workspaceId: v.string(), orgId: v.string(), userId: v.string(), keyId: v.string(),
  scopes: v.array(v.string()), role: roleValidator });

export async function requireKey(ctx: QueryCtx | MutationCtx, publicId: string, scope?: 'read' | 'measure') {
  const key = await ctx.db.query('apiKeys').withIndex('by_public_id', (q) => q.eq('publicId', publicId)).unique();
  if (!key || key.revokedAt !== null) throw new Error('api_key_invalid');
  const [workspace, user, organization] = await Promise.all([ctx.db.get(key.workspaceId), ctx.db.get(key.createdBy), ctx.db.get(key.organizationId)]);
  const membership = await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id', (q) =>
    q.eq('organizationId', key.organizationId).eq('userId', key.createdBy)).unique();
  if (!workspace || workspace.organizationId !== key.organizationId || !user || !organization || !membership) throw new Error('api_key_invalid');
  if (scope && !key.scopes.includes(scope)) throw new Error('api_scope_denied');
  const tenant: TenantContext = { user, organization, membership, role: membership.role };
  if (scope === 'measure') requireRole(tenant, 'editor');
  return { key, workspace, tenant };
}

export const resolveHash = internalQuery({
  args: { hash: v.string() }, returns: v.union(contextValidator, v.null()),
  handler: async (ctx, args) => {
    const key = await ctx.db.query('apiKeys').withIndex('by_key_hash', (q) => q.eq('keyHash', args.hash)).unique();
    if (!key) return null;
    try {
      const { workspace, tenant } = await requireKey(ctx, key.publicId);
      return { workspaceId: workspace.publicId, orgId: tenant.organization.publicId, userId: tenant.user.publicId,
        keyId: key.publicId, scopes: key.scopes, role: tenant.role };
    } catch { return null; }
  },
});

export const list = tenantQuery({
  args: { workspaceId: v.string() }, returns: v.array(keySummary),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'admin');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const rows = await ctx.db.query('apiKeys').withIndex('by_workspace_id_and_created_at', (q) => q.eq('workspaceId', workspace._id)).order('desc').take(100);
    return rows.map((row) => ({ id: row.publicId, name: row.name, key_prefix: row.keyPrefix, scopes: row.scopes,
      created_at: new Date(row.createdAt).toISOString(), last_used_at: row.lastUsedAt === null ? null : new Date(row.lastUsedAt).toISOString(),
      revoked_at: row.revokedAt === null ? null : new Date(row.revokedAt).toISOString() }));
  },
});

export const issue = internalMutation({
  args: { workspaceId: v.string(), name: v.string(), hash: v.string(), prefix: v.string(), scopes: v.array(v.union(v.literal('read'), v.literal('measure'))) },
  returns: keySummary,
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx);
    requireRole(tenant, 'admin');
    const workspace = await requireWorkspace(ctx, tenant, args.workspaceId);
    if (!args.name.trim() || args.name.length > 60 || !/^[a-f0-9]{64}$/.test(args.hash) || !args.prefix.startsWith('alo_live_') || !args.scopes.length) throw new Error('invalid_api_key');
    const existing = await ctx.db.query('apiKeys').withIndex('by_workspace_id_and_created_at', (q) => q.eq('workspaceId', workspace._id)).take(100);
    if (existing.length >= 100) throw new Error('api_key_limit_reached');
    const now = Date.now();
    const publicId = newPublicId();
    await ctx.db.insert('apiKeys', { publicId, workspaceId: workspace._id, organizationId: tenant.organization._id,
      createdBy: tenant.user._id, name: args.name.trim(), keyPrefix: args.prefix, keyHash: args.hash,
      scopes: [...new Set(args.scopes)], lastUsedAt: null, revokedAt: null, createdAt: now });
    return { id: publicId, name: args.name.trim(), key_prefix: args.prefix, scopes: args.scopes,
      last_used_at: null, revoked_at: null, created_at: new Date(now).toISOString() };
  },
});

export const revoke = tenantMutation({
  args: { workspaceId: v.string(), id: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'admin');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('apiKeys').withIndex('by_public_id', (q) => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('api_key_not_found');
    if (row.revokedAt === null) await ctx.db.patch(row._id, { revokedAt: Date.now() });
    return null;
  },
});
