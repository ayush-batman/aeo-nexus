import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { newPublicId } from './lib/publicIds';

type Payload = Record<string, unknown>;

function asPayload(value: unknown): Payload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_import_payload');
  }
  return value as Payload;
}

function stringField(payload: Payload, field: string): string {
  const value = payload[field];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`invalid_import_field:${field}`);
  }
  return value;
}

function nullableStringField(payload: Payload, field: string): string | null {
  const value = payload[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`invalid_import_field:${field}`);
  return value;
}

function numberField(payload: Payload, field: string, fallback?: number): number {
  const value = payload[field];
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`invalid_import_field:${field}`);
  }
  return value;
}

function booleanField(payload: Payload, field: string, fallback: boolean): boolean {
  const value = payload[field];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`invalid_import_field:${field}`);
  return value;
}

function planField(payload: Payload) {
  const value = stringField(payload, 'plan');
  if (!['free', 'starter', 'pro', 'agency', 'enterprise'].includes(value)) {
    throw new Error('invalid_import_field:plan');
  }
  return value as 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';
}

function roleField(payload: Payload) {
  const value = stringField(payload, 'role');
  if (!['owner', 'admin', 'editor', 'viewer'].includes(value)) {
    throw new Error('invalid_import_field:role');
  }
  return value as 'owner' | 'admin' | 'editor' | 'viewer';
}

async function organizationByPublicId(
  ctx: MutationCtx,
  publicId: string,
): Promise<Doc<'organizations'>> {
  const organization = await ctx.db
    .query('organizations')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (!organization) throw new Error(`missing_import_parent:organizations:${publicId}`);
  return organization;
}

async function upsertOrganization(
  ctx: MutationCtx,
  payload: Payload,
): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const value = {
    name: stringField(payload, 'name'),
    plan: planField(payload),
    stripeCustomerId: nullableStringField(payload, 'stripeCustomerId'),
    stripeSubscriptionId: nullableStringField(payload, 'stripeSubscriptionId'),
    razorpaySubscriptionId: nullableStringField(payload, 'razorpaySubscriptionId'),
    createdAt: numberField(payload, 'createdAt', Date.now()),
    updatedAt: numberField(payload, 'updatedAt', Date.now()),
  };
  const existing = await ctx.db
    .query('organizations')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert('organizations', { publicId, ...value });
}

async function upsertUser(
  ctx: MutationCtx,
  payload: Payload,
): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const email = stringField(payload, 'email');
  const organization = await organizationByPublicId(
    ctx,
    stringField(payload, 'organizationPublicId'),
  );
  const now = Date.now();
  let user = await ctx.db
    .query('users')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  const value = {
    email,
    normalizedEmail: email.trim().toLowerCase(),
    emailVerified: false,
    fullName: nullableStringField(payload, 'fullName'),
    avatarUrl: nullableStringField(payload, 'avatarUrl'),
    onboardingCompleted: booleanField(payload, 'onboardingCompleted', false),
    isSuperAdmin: booleanField(payload, 'isSuperAdmin', false),
    legacySupabaseId: publicId,
    createdAt: numberField(payload, 'createdAt', now),
    updatedAt: now,
  };
  if (user) {
    await ctx.db.patch(user._id, value);
    user = await ctx.db.get(user._id);
  } else {
    const userId = await ctx.db.insert('users', {
      publicId,
      authSubject: null,
      claimedAt: null,
      ...value,
    });
    user = await ctx.db.get(userId);
  }
  if (!user) throw new Error('user_import_failed');

  const membership = await ctx.db
    .query('memberships')
    .withIndex('by_organization_id_and_user_id', (q) =>
      q.eq('organizationId', organization._id).eq('userId', user!._id),
    )
    .unique();
  const membershipValue = {
    organizationId: organization._id,
    userId: user._id,
    role: roleField(payload),
    updatedAt: now,
  };
  if (membership) await ctx.db.patch(membership._id, membershipValue);
  else {
    await ctx.db.insert('memberships', {
      publicId: newPublicId(),
      createdAt: numberField(payload, 'createdAt', now),
      ...membershipValue,
    });
  }
}

async function upsertWorkspace(
  ctx: MutationCtx,
  payload: Payload,
): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const organization = await organizationByPublicId(
    ctx,
    stringField(payload, 'organizationPublicId'),
  );
  const value = {
    organizationId: organization._id,
    name: stringField(payload, 'name'),
    logoUrl: nullableStringField(payload, 'logoUrl'),
    settings: payload.settings ?? {},
    createdAt: numberField(payload, 'createdAt', Date.now()),
    updatedAt: numberField(payload, 'updatedAt', Date.now()),
  };
  const existing = await ctx.db
    .query('workspaces')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert('workspaces', { publicId, ...value });
}

const batchResultValidator = v.object({
  processed: v.number(),
  nextPublicId: v.union(v.string(), v.null()),
  complete: v.boolean(),
});

export const materializeTenantBatch = internalMutation({
  args: {
    manifestHash: v.string(),
    sourceTable: v.union(
      v.literal('organizations'),
      v.literal('users'),
      v.literal('workspaces'),
    ),
    afterPublicId: v.union(v.string(), v.null()),
  },
  returns: batchResultValidator,
  handler: async (ctx, args) => {
    const staged = await ctx.db
      .query('importStaging')
      .withIndex('by_manifest_table_public_id', (q) => {
        const prefix = q
          .eq('manifestHash', args.manifestHash)
          .eq('sourceTable', args.sourceTable);
        return args.afterPublicId
          ? prefix.gt('sourcePublicId', args.afterPublicId)
          : prefix;
      })
      .take(200);

    for (const row of staged) {
      const payload = asPayload(row.payload);
      if (stringField(payload, 'publicId') !== row.sourcePublicId) {
        throw new Error('staging_public_id_mismatch');
      }
      if (args.sourceTable === 'organizations') await upsertOrganization(ctx, payload);
      else if (args.sourceTable === 'users') await upsertUser(ctx, payload);
      else await upsertWorkspace(ctx, payload);
    }

    const nextPublicId = staged.at(-1)?.sourcePublicId ?? null;
    return {
      processed: staged.length,
      nextPublicId,
      complete: staged.length < 200,
    };
  },
});
