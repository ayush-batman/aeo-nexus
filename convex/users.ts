import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { authComponent } from './auth';
import { newPublicId } from './lib/publicIds';
import { requireTenant } from './lib/tenant';
import { roleValidator } from './validators';

const currentUserValidator = v.object({
  publicId: v.string(),
  email: v.string(),
  fullName: v.union(v.string(), v.null()),
  avatarUrl: v.union(v.string(), v.null()),
  onboardingCompleted: v.boolean(),
  organizationPublicId: v.string(),
  role: roleValidator,
});

export const provisionCurrentUser = mutation({
  args: {},
  returns: currentUserValidator,
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    const normalizedEmail = authUser.email.trim().toLowerCase();
    const isAdminEmail = normalizedEmail === 'work.ayushg@gmail.com' && authUser.emailVerified === true;
    const now = Date.now();

    let user = await ctx.db
      .query('users')
      .withIndex('by_auth_subject', (q) => q.eq('authSubject', authUser._id))
      .unique();

    if (!user) {
      const importedUser = await ctx.db
        .query('users')
        .withIndex('by_normalized_email', (q) => q.eq('normalizedEmail', normalizedEmail))
        .unique();

      if (importedUser) {
        if (importedUser.authSubject !== null) {
          throw new Error('email_already_claimed');
        }
        if (!authUser.emailVerified) {
          throw new Error('verified_email_required');
        }
        await ctx.db.patch(importedUser._id, {
          authSubject: authUser._id,
          emailVerified: true,
          isSuperAdmin: importedUser.isSuperAdmin || isAdminEmail,
          claimedAt: now,
          updatedAt: now,
        });
        user = await ctx.db.get(importedUser._id);
      } else {
        if (!authUser.emailVerified) {
          throw new Error('verified_email_required');
        }

        const organizationId = await ctx.db.insert('organizations', {
          publicId: newPublicId(),
          name: `${authUser.name?.trim() || normalizedEmail.split('@')[0]}'s Organization`,
          plan: 'free',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          razorpaySubscriptionId: null,
          createdAt: now,
          updatedAt: now,
        });

        const userId = await ctx.db.insert('users', {
          publicId: newPublicId(),
          authSubject: authUser._id,
          email: authUser.email,
          normalizedEmail,
          emailVerified: true,
          fullName: authUser.name ?? null,
          avatarUrl: authUser.image ?? null,
          onboardingCompleted: false,
          isSuperAdmin: isAdminEmail,
          legacySupabaseId: null,
          claimedAt: now,
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert('memberships', {
          publicId: newPublicId(),
          organizationId,
          userId,
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        });

        const workspaceId = await ctx.db.insert('workspaces', {
          publicId: newPublicId(),
          organizationId,
          name: 'My Brand',
          logoUrl: null,
          settings: {},
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.insert('measurementJobs', {
          publicId: newPublicId(),
          workspaceId,
          organizationId,
          purpose: 'initial_visibility',
          status: 'queued',
          attempts: 0,
          maxAttempts: 3,
          availableAt: now,
          claimToken: null,
          claimExpiresAt: null,
          lastError: null,
          result: {},
          createdAt: now,
          updatedAt: now,
          completedAt: null,
        });

        // Imported-account claims and later logins must not resend this.
        await ctx.scheduler.runAfter(0, internal.mailActions.welcome, { workspaceId, userId });

        user = await ctx.db.get(userId);
      }
    } else if (isAdminEmail && user.normalizedEmail === normalizedEmail && !user.isSuperAdmin) {
      await ctx.db.patch(user._id, { isSuperAdmin: true, updatedAt: now });
      user = await ctx.db.get(user._id);
    }

    if (!user) {
      throw new Error('user_provision_failed');
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
      publicId: user.publicId,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      onboardingCompleted: user.onboardingCompleted,
      organizationPublicId: organization.publicId,
      role: membership.role,
    };
  },
});

export const current = query({
  args: {},
  returns: currentUserValidator,
  handler: async (ctx) => {
    const tenant = await requireTenant(ctx);
    return {
      publicId: tenant.user.publicId,
      email: tenant.user.email,
      fullName: tenant.user.fullName,
      avatarUrl: tenant.user.avatarUrl,
      onboardingCompleted: tenant.user.onboardingCompleted,
      organizationPublicId: tenant.organization.publicId,
      role: tenant.membership.role,
    };
  },
});

export const workspaceContext = query({
  args: { activeWorkspacePublicId: v.union(v.string(), v.null()) },
  returns: v.union(v.null(), v.object({
    userId: v.string(), orgId: v.string(), workspaceId: v.string(),
    onboardingCompleted: v.boolean(), role: roleValidator,
  })),
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx);
    let workspace = args.activeWorkspacePublicId
      ? await ctx.db.query('workspaces').withIndex('by_public_id', (q) =>
        q.eq('publicId', args.activeWorkspacePublicId!)).unique() : null;
    if (!workspace || workspace.organizationId !== tenant.organization._id) {
      workspace = await ctx.db.query('workspaces').withIndex('by_organization_id', (q) =>
        q.eq('organizationId', tenant.organization._id)).first();
    }
    if (!workspace) return null;
    return { userId: tenant.user.publicId, orgId: tenant.organization.publicId,
      workspaceId: workspace.publicId, onboardingCompleted: tenant.user.onboardingCompleted,
      role: tenant.role };
  },
});
