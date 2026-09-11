import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { requireKey } from './apiKeys';
import { scanDocument } from './records';
import schema from './schema';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';

export const authorize = internalMutation({
  args: { keyId: v.string(), scope: v.union(v.literal('read'), v.literal('measure'), v.null()), bucket: v.string(), limit: v.number() },
  returns: v.object({ ok: v.boolean(), retryAfter: v.number() }),
  handler: async (ctx, args) => {
    const { key } = await requireKey(ctx, args.keyId, args.scope ?? undefined);
    if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 120 || args.bucket.length > 100) throw new Error('invalid_rate_limit');
    const limiter = new RateLimiter(components.rateLimiter, { api: { kind: 'fixed window', rate: args.limit, period: 60_000 } });
    const decision = await limiter.limit(ctx, 'api', { key: `${key.publicId}:${args.bucket}` });
    if (decision.ok && (key.lastUsedAt === null || Date.now() - key.lastUsedAt > 60_000)) await ctx.db.patch(key._id, { lastUsedAt: Date.now() });
    return { ok: decision.ok, retryAfter: decision.ok ? 0 : Math.max(1, Math.ceil((decision.retryAfter ?? 60_000) / 1000)) };
  },
});

export const workspace = internalQuery({
  args: { keyId: v.string() }, returns: v.object({ id: v.string(), name: v.string(), settings: v.any() }),
  handler: async (ctx, args) => {
    const { workspace } = await requireKey(ctx, args.keyId, 'read');
    return { id: workspace.publicId, name: workspace.name, settings: workspace.settings };
  },
});

export const scans = internalQuery({
  args: { keyId: v.string(), paginationOpts: paginationOptsValidator, since: v.optional(v.number()), before: v.optional(v.number()) },
  returns: v.object({ page: v.array(scanDocument), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const { workspace } = await requireKey(ctx, args.keyId, 'read');
    const page = await ctx.db.query('scans').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id).gte('createdAt', args.since ?? 0).lt('createdAt', args.before ?? Number.MAX_SAFE_INTEGER))
      .order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(5, Math.max(1, args.paginationOpts.numItems)) });
    return { page: page.page.filter((row) => !row.failureCode), continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const prompts = internalQuery({
  args: { keyId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), prompt: v.string(), category: v.union(v.string(), v.null()),
    is_favorite: v.boolean(), created_at: v.string() })), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const { workspace } = await requireKey(ctx, args.keyId, 'read');
    const page = await ctx.db.query('prompts').withIndex('by_workspace_id_and_created_at', (q) => q.eq('workspaceId', workspace._id))
      .order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: page.page.map((row) => ({ id: row.publicId, prompt: row.prompt, category: row.category,
      is_favorite: row.isFavorite, created_at: new Date(row.createdAt).toISOString() })), continueCursor: page.continueCursor, isDone: page.isDone };
  },
});

export const accuracy = internalQuery({
  args: { keyId: v.string(), since: v.number() },
  returns: v.array(v.object({ ...schema.tables.accuracyClaims.validator.fields, _id: v.id('accuracyClaims'), _creationTime: v.number() })),
  handler: async (ctx, args) => {
    const { workspace } = await requireKey(ctx, args.keyId, 'read');
    return ctx.db.query('accuracyClaims').withIndex('by_workspace_id_and_created_at', (q) =>
      q.eq('workspaceId', workspace._id).gte('createdAt', args.since)).order('desc').take(100);
  },
});
