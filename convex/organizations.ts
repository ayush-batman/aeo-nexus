import { v } from 'convex/values';

import { tenantQuery } from './lib/tenant';
import { planValidator, roleValidator } from './validators';

export const current = tenantQuery({
  args: {},
  returns: v.object({
    publicId: v.string(),
    name: v.string(),
    plan: planValidator,
    role: roleValidator,
  }),
  handler: async (ctx) => ({
    publicId: ctx.tenant.organization.publicId,
    name: ctx.tenant.organization.name,
    plan: ctx.tenant.organization.plan,
    role: ctx.tenant.role,
  }),
});
