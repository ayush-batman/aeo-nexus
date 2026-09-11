import { v } from 'convex/values';
import { extractProviderCitations } from '../lib/ai/citation-provenance';

import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { newPublicId } from './lib/publicIds';
import { materializeRemainingRecord } from './lib/importRecords';
import { upsertScanMetric } from './lib/scanMetrics';

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

function nullableNumberField(payload: Payload, field: string): number | null {
  const value = payload[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`invalid_import_field:${field}`);
  }
  return value;
}

function stringArrayField(payload: Payload, field: string): string[] {
  const value = payload[field];
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`invalid_import_field:${field}`);
  }
  return value;
}

function engineField(payload: Payload, field = 'platform') {
  const value = stringField(payload, field);
  if (
    ![
      'chatgpt',
      'perplexity',
      'claude',
      'gemini',
      'google_ai',
      'google_ai_overview',
      'bing_copilot',
      'mock',
    ].includes(value)
  ) {
    throw new Error(`invalid_import_field:${field}`);
  }
  return value as
    | 'chatgpt'
    | 'perplexity'
    | 'claude'
    | 'gemini'
    | 'google_ai'
    | 'google_ai_overview'
    | 'bing_copilot'
    | 'mock';
}

function sentimentField(payload: Payload) {
  const value = payload.sentiment;
  if (value === null || value === undefined) return null;
  if (!['positive', 'neutral', 'negative'].includes(String(value))) {
    throw new Error('invalid_import_field:sentiment');
  }
  return value as 'positive' | 'neutral' | 'negative';
}

function measurementModeField(payload: Payload): 'standard' | 'battle' | null {
  if (payload.measurementMode === 'standard') return 'standard';
  if (payload.measurementMode === 'battle') return 'battle';
  return null;
}

function normalizeCitations(
  payload: Payload,
  provider: string,
  sampleId: string,
): Doc<'scans'>['citations'] {
  const value = payload.citations;
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('invalid_import_field:citations');

  return value.map((raw) => {
    const citation = asPayload(raw);
    const provenance = citation.provenance;
    const rawProviderReference = citation.raw_provider_reference ?? citation.rawProviderReference ?? null;
    const url = stringField(citation, 'url');
    const proven = extractProviderCitations([rawProviderReference], { provider, sampleId })
      .some((reference) => {
        if (reference.provenance !== 'provider_citation') return false;
        try { return reference.url === new URL(url).toString(); } catch { return false; }
      });
    const normalizedProvenance =
      provenance === 'provider_citation' && proven ? 'provider_citation'
        : provenance === 'link_mentioned' ? 'link_mentioned' : 'unverified';
    const fetchValidation = citation.fetch_validation ?? citation.fetchValidation;
    const normalizedValidation =
      fetchValidation === 'valid' ||
      fetchValidation === 'invalid' ||
      fetchValidation === 'blocked' ||
      fetchValidation === 'not_checked'
        ? fetchValidation
        : 'not_checked';

    return {
      url,
      title: typeof citation.title === 'string' ? citation.title : '',
      isOwnDomain: Boolean(citation.is_own_domain ?? citation.isOwnDomain),
      provenance: normalizedProvenance,
      provider: typeof citation.provider === 'string' ? citation.provider : provider,
      sampleId:
        typeof (citation.sample_id ?? citation.sampleId) === 'string'
          ? String(citation.sample_id ?? citation.sampleId)
          : sampleId,
      rawProviderReference,
      fetchValidation: normalizedValidation,
    };
  });
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
  if (user?.authSubject || user?.claimedAt !== null && user?.claimedAt !== undefined) {
    throw new Error('import_user_already_claimed');
  }
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

async function workspaceByPublicId(ctx: MutationCtx, publicId: string) {
  const workspace = await ctx.db
    .query('workspaces')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (!workspace) throw new Error(`missing_import_parent:workspaces:${publicId}`);
  return workspace;
}

async function userByPublicId(ctx: MutationCtx, publicId: string | null) {
  if (!publicId) return null;
  const user = await ctx.db
    .query('users')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (!user) throw new Error(`missing_import_parent:users:${publicId}`);
  return user;
}

async function upsertProduct(ctx: MutationCtx, payload: Payload): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const workspace = await workspaceByPublicId(
    ctx,
    stringField(payload, 'workspacePublicId'),
  );
  const value = {
    workspaceId: workspace._id,
    name: stringField(payload, 'name'),
    website: nullableStringField(payload, 'website'),
    description: nullableStringField(payload, 'description'),
    keywords: stringArrayField(payload, 'keywords'),
    competitors: payload.competitors ?? [],
    knowledgeBase: payload.knowledgeBase ?? {},
    createdAt: numberField(payload, 'createdAt', Date.now()),
    updatedAt: numberField(payload, 'updatedAt', Date.now()),
  };
  const existing = await ctx.db
    .query('products')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert('products', { publicId, ...value });
}

async function upsertScan(ctx: MutationCtx, payload: Payload): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const workspace = await workspaceByPublicId(
    ctx,
    stringField(payload, 'workspacePublicId'),
  );
  const platform = engineField(payload);
  const value = {
    workspaceId: workspace._id,
    platform,
    prompt: stringField(payload, 'prompt'),
    response: stringField(payload, 'response'),
    brandMentioned: booleanField(payload, 'brandMentioned', false),
    brandVariants: stringArrayField(payload, 'brandVariants'),
    mentionPosition: nullableNumberField(payload, 'mentionPosition'),
    sentiment: sentimentField(payload),
    sentimentScore: nullableNumberField(payload, 'sentimentScore'),
    sentimentReason: nullableStringField(payload, 'sentimentReason'),
    competitorsMentioned: stringArrayField(payload, 'competitorsMentioned'),
    listItems: stringArrayField(payload, 'listItems'),
    analyzerConfidence: nullableNumberField(payload, 'confidence'),
    analyzerMethod: null,
    analyzerModel: null,
    citations: normalizeCitations(payload, platform, publicId),
    winner: nullableStringField(payload, 'winner'),
    winnerReason: nullableStringField(payload, 'winnerReason'),
    measurementRunId: nullableStringField(payload, 'measurementRunId'),
    measurementContractVersion: nullableStringField(payload, 'measurementContractVersion'),
    sampleId: nullableStringField(payload, 'sampleId'),
    sampleNumber: nullableNumberField(payload, 'sampleNumber'),
    providerModel: nullableStringField(payload, 'providerModel'),
    measurementRegion: nullableStringField(payload, 'measurementRegion'),
    measurementMode: measurementModeField(payload),
    scorerVersion: nullableStringField(payload, 'scorerVersion'),
    failureCode: null,
    failureMessage: null,
    createdAt: numberField(payload, 'createdAt', Date.now()),
  };
  const existing = await ctx.db
    .query('scans')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (existing) await ctx.db.patch(existing._id, value);
  const scanId = existing?._id ?? await ctx.db.insert('scans', { publicId, ...value });
  await upsertScanMetric(ctx, scanId, { publicId, ...value });
}

async function upsertApiKey(ctx: MutationCtx, payload: Payload): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const workspace = await workspaceByPublicId(
    ctx,
    stringField(payload, 'workspacePublicId'),
  );
  const organization = await organizationByPublicId(
    ctx,
    stringField(payload, 'organizationPublicId'),
  );
  const creator = await userByPublicId(ctx, stringField(payload, 'createdByPublicId'));
  if (!creator) throw new Error('missing_import_parent:created_by');
  if (workspace.organizationId !== organization._id) throw new Error('import_organization_mismatch');
  const membership = await ctx.db.query('memberships')
    .withIndex('by_organization_id_and_user_id', (q) => q.eq('organizationId', organization._id).eq('userId', creator._id)).unique();
  if (!membership) throw new Error('import_creator_organization_mismatch');
  const value = {
    workspaceId: workspace._id,
    organizationId: organization._id,
    createdBy: creator._id,
    name: stringField(payload, 'name'),
    keyPrefix: stringField(payload, 'keyPrefix'),
    keyHash: stringField(payload, 'keyHash'),
    scopes: stringArrayField(payload, 'scopes'),
    lastUsedAt: nullableNumberField(payload, 'lastUsedAt'),
    createdAt: numberField(payload, 'createdAt', Date.now()),
    revokedAt: nullableNumberField(payload, 'revokedAt'),
  };
  const existing = await ctx.db
    .query('apiKeys')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId))
    .unique();
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert('apiKeys', { publicId, ...value });
}

async function upsertBillingEvent(ctx: MutationCtx, payload: Payload): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const providerValue = stringField(payload, 'provider');
  if (providerValue !== 'stripe' && providerValue !== 'razorpay') {
    throw new Error('invalid_import_field:provider');
  }
  const organization = await organizationByPublicId(
    ctx,
    stringField(payload, 'organizationPublicId'),
  );
  const eventId = stringField(payload, 'eventId');
  const provider: 'stripe' | 'razorpay' = providerValue;
  const value = {
    provider,
    eventId,
    eventType: stringField(payload, 'eventType'),
    organizationId: organization._id,
    plan: planField(payload),
    providerSubscriptionId: nullableStringField(payload, 'providerSubscriptionId'),
    occurredAt: nullableNumberField(payload, 'occurredAt'),
    appliedAt: numberField(payload, 'appliedAt', Date.now()),
    changedOrganization: false,
  };
  const existing = await ctx.db
    .query('billingWebhookEvents')
    .withIndex('by_provider_and_event_id', (q) =>
      q.eq('provider', provider).eq('eventId', eventId),
    )
    .unique();
  if (existing) await ctx.db.patch(existing._id, value);
  else await ctx.db.insert('billingWebhookEvents', { publicId, ...value });
}

async function upsertPublicScan(ctx: MutationCtx, payload: Payload): Promise<void> {
  const publicId = stringField(payload, 'publicId');
  const platform = engineField(payload);
  const createdAt = numberField(payload, 'createdAt');
  const brandMentioned = payload.brandMentioned;
  if (brandMentioned !== null && brandMentioned !== undefined && typeof brandMentioned !== 'boolean') {
    throw new Error('invalid_import_field:brandMentioned');
  }
  const value = {
    publicId, platform, createdAt,
    ipHash: stringField(payload, 'ipHash'),
    brandName: stringField(payload, 'brandName'),
    prompt: stringField(payload, 'prompt'),
    response: nullableStringField(payload, 'response'),
    brandMentioned: brandMentioned ?? null,
    mentionPosition: nullableNumberField(payload, 'mentionPosition'),
    sentiment: sentimentField(payload),
    competitorsMentioned: stringArrayField(payload, 'competitorsMentioned'),
    citations: normalizeCitations(payload, platform, publicId),
    errorMessage: nullableStringField(payload, 'errorMessage'),
    email: nullableStringField(payload, 'email'),
    // Existing public-scan retention is 30 days from creation, never from import.
    expiresAt: numberField(payload, 'expiresAt', createdAt + 30 * 24 * 60 * 60 * 1000),
  };
  const existing = await ctx.db.query('publicScans')
    .withIndex('by_public_id', (q) => q.eq('publicId', publicId)).unique();
  if (existing) await ctx.db.replace(existing._id, value);
  else await ctx.db.insert('publicScans', value);
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
      .take(10);

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
      complete: staged.length < 10,
    };
  },
});

export const materializeCriticalBatch = internalMutation({
  args: {
    manifestHash: v.string(),
    sourceTable: v.union(
      v.literal('products'),
      v.literal('llm_scans'),
      v.literal('api_keys'),
      v.literal('billing_webhook_events'),
      v.literal('public_scans'),
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
      .take(10);

    for (const row of staged) {
      const payload = asPayload(row.payload);
      if (stringField(payload, 'publicId') !== row.sourcePublicId) {
        throw new Error('staging_public_id_mismatch');
      }
      if (args.sourceTable === 'products') await upsertProduct(ctx, payload);
      else if (args.sourceTable === 'llm_scans') await upsertScan(ctx, payload);
      else if (args.sourceTable === 'api_keys') await upsertApiKey(ctx, payload);
      else if (args.sourceTable === 'public_scans') await upsertPublicScan(ctx, payload);
      else await upsertBillingEvent(ctx, payload);
    }

    return {
      processed: staged.length,
      nextPublicId: staged.at(-1)?.sourcePublicId ?? null,
      complete: staged.length < 10,
    };
  },
});

export const materializeRemainingBatch = internalMutation({
  args: {
    manifestHash: v.string(),
    sourceTable: v.union(
      v.literal('prompt_library'), v.literal('forum_threads'), v.literal('reddit_accounts'),
      v.literal('content_analyses'), v.literal('scheduled_scans'), v.literal('analytics_events'),
      v.literal('alert_preferences'), v.literal('notifications'), v.literal('interventions'),
      v.literal('action_events'), v.literal('sentiment_drift_snapshots'),
      v.literal('competitor_attributes'), v.literal('accuracy_claims'),
      v.literal('scan_quota_reservations'), v.literal('decision_packets'),
      v.literal('weekly_digest_deliveries'), v.literal('measurement_jobs'),
      v.literal('experiments'), v.literal('newsletter_subscribers'),
    ),
    afterPublicId: v.union(v.string(), v.null()),
  },
  returns: batchResultValidator,
  handler: async (ctx, args) => {
    const staged = await ctx.db.query('importStaging')
      .withIndex('by_manifest_table_public_id', (q) => {
        const prefix = q.eq('manifestHash', args.manifestHash).eq('sourceTable', args.sourceTable);
        return args.afterPublicId ? prefix.gt('sourcePublicId', args.afterPublicId) : prefix;
      }).take(10);
    for (const row of staged) {
      const payload = asPayload(row.payload);
      if (stringField(payload, 'publicId') !== row.sourcePublicId) {
        throw new Error('staging_public_id_mismatch');
      }
      await materializeRemainingRecord(ctx, args.sourceTable, payload);
    }
    return {
      processed: staged.length,
      nextPublicId: staged.at(-1)?.sourcePublicId ?? null,
      complete: staged.length < 10,
    };
  },
});
