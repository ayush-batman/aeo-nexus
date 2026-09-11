import {
  customCtx,
  customQuery,
  customMutation,
} from 'convex-helpers/server/customFunctions';

import type { Doc } from '../_generated/dataModel';
import { ConvexError } from 'convex/values';
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from '../_generated/server';
import { authComponent } from '../auth';
import { assertRole, type TenantRole } from './rolePolicy';

export type TenantContext = {
  user: Doc<'users'>;
  membership: Doc<'memberships'>;
  organization: Doc<'organizations'>;
  role: TenantRole;
};

type ReadContext = QueryCtx | MutationCtx;

export async function requireTenant(ctx: ReadContext): Promise<TenantContext> {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser.emailVerified) throw new Error('verified_email_required');
  const user = await ctx.db
    .query('users')
    .withIndex('by_auth_subject', (q) => q.eq('authSubject', authUser._id))
    .unique();

  if (!user) {
    throw new ConvexError('profile_not_provisioned');
  }

  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_user_id', (q) => q.eq('userId', user._id))
    .first();

  if (!membership) {
    throw new Error('membership_not_found');
  }

  const organization = await ctx.db.get(membership.organizationId);
  if (!organization) {
    throw new Error('organization_not_found');
  }

  return {
    user,
    membership,
    organization,
    role: membership.role,
  };
}

export async function requireWorkspace(
  ctx: ReadContext,
  tenant: TenantContext,
  publicId: string,
): Promise<Doc<'workspaces'>> {
  const workspace = await ctx.db
    .query('workspaces')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();

  if (!workspace || workspace.organizationId !== tenant.organization._id) {
    throw new Error('workspace_not_found');
  }

  return workspace;
}

export function requireRole(tenant: TenantContext, role: TenantRole): void {
  assertRole(tenant.role, role);
}

const tenantContext = customCtx(async (ctx: ReadContext) => ({
  tenant: await requireTenant(ctx),
}));

export const tenantQuery = customQuery(query, tenantContext);
export const tenantMutation = customMutation(mutation, tenantContext);
