import { v } from 'convex/values';

import { newPublicId } from './lib/publicIds';
import { requireRole, requireWorkspace, tenantMutation, tenantQuery } from './lib/tenant';

const workspaceValidator = v.object({
  publicId: v.string(),
  name: v.string(),
  logoUrl: v.union(v.string(), v.null()),
  settings: v.any(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const get = tenantQuery({
  args: { workspaceId: v.string() }, returns: workspaceValidator,
  handler: async (ctx, args) => {
    const { publicId, name, logoUrl, settings, createdAt, updatedAt } =
      await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    return { publicId, name, logoUrl, settings, createdAt, updatedAt };
  },
});

export const list = tenantQuery({
  args: {},
  returns: v.array(workspaceValidator),
  handler: async (ctx) => {
    const workspaces = await ctx.db
      .query('workspaces')
      .withIndex('by_organization_id_and_created_at', (q) =>
        q.eq('organizationId', ctx.tenant.organization._id),
      )
      .order('desc')
      .take(100);

    return workspaces.map(({ publicId, name, logoUrl, settings, createdAt, updatedAt }) => ({
      publicId,
      name,
      logoUrl,
      settings,
      createdAt,
      updatedAt,
    }));
  },
});

export const create = tenantMutation({
  args: {
    name: v.string(),
    settings: v.object({ website: v.union(v.string(), v.null()), competitors: v.array(v.string()) }),
  },
  returns: v.union(
    v.object({ status: v.literal('denied'), limit: v.number() }),
    v.object({
      status: v.literal('created'),
      workspace: workspaceValidator,
      measurementJobPublicId: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'admin');
    const name = args.name.trim();
    if (name.length < 1 || name.length > 100) {
      throw new Error('invalid_workspace_name');
    }
    if (args.settings.competitors.length > 20 || args.settings.competitors.some((value) => !value.trim() || value.length > 100)) {
      throw new Error('invalid_workspace_settings');
    }
    if (args.settings.website) {
      let url: URL;
      try { url = new URL(args.settings.website); } catch { throw new Error('invalid_website'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || args.settings.website.length > 2048) {
        throw new Error('invalid_website');
      }
    }

    if (ctx.tenant.organization.plan === 'free') {
      const existing = await ctx.db
        .query('workspaces')
        .withIndex('by_organization_id', (q) =>
          q.eq('organizationId', ctx.tenant.organization._id),
        )
        .take(1);
      if (existing.length >= 1) {
        return { status: 'denied' as const, limit: 1 };
      }
    }

    const now = Date.now();
    const workspacePublicId = newPublicId();
    const workspaceId = await ctx.db.insert('workspaces', {
      publicId: workspacePublicId,
      organizationId: ctx.tenant.organization._id,
      name,
      logoUrl: null,
      settings: args.settings,
      createdAt: now,
      updatedAt: now,
    });
    const measurementJobPublicId = newPublicId();
    await ctx.db.insert('measurementJobs', {
      publicId: measurementJobPublicId,
      workspaceId,
      organizationId: ctx.tenant.organization._id,
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

    return {
      status: 'created' as const,
      workspace: {
        publicId: workspacePublicId,
        name,
        logoUrl: null,
        settings: args.settings,
        createdAt: now,
        updatedAt: now,
      },
      measurementJobPublicId,
    };
  },
});
