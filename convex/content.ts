import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { requireTenant, requireWorkspace, requireRole } from './lib/tenant';
import { limits } from './lib/limits';

export const authorize = internalMutation({
  args: { workspaceId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx);
    requireRole(tenant, 'editor');
    await requireWorkspace(ctx, tenant, args.workspaceId);
    const result = await limits.limit(ctx, 'discovery', { key: `content:${tenant.organization.publicId}` });
    if (!result.ok) throw new Error('rate_limit_exceeded');
    return null;
  },
});
