import { validate } from 'convex-helpers/validators';

import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import schema from '../schema';

export const remainingImportTables = {
  prompt_library: 'prompts',
  forum_threads: 'forumThreads',
  reddit_accounts: 'redditAccounts',
  content_analyses: 'contentAnalyses',
  scheduled_scans: 'scheduledScans',
  analytics_events: 'analyticsEvents',
  alert_preferences: 'alertPreferences',
  notifications: 'notifications',
  interventions: 'actions',
  action_events: 'actionEvents',
  sentiment_drift_snapshots: 'sentimentDriftSnapshots',
  competitor_attributes: 'competitorAttributes',
  accuracy_claims: 'accuracyClaims',
  scan_quota_reservations: 'scanQuotaReservations',
  decision_packets: 'decisionPackets',
  weekly_digest_deliveries: 'weeklyDigestDeliveries',
  measurement_jobs: 'measurementJobs',
  experiments: 'experiments',
  newsletter_subscribers: 'newsletterSubscribers',
} as const;

export type RemainingSourceTable = keyof typeof remainingImportTables;
type TargetTable = (typeof remainingImportTables)[RemainingSourceTable];
type ParentTable = 'organizations' | 'workspaces' | 'users' | 'products' | 'scans' | 'forumThreads' | 'actions';
type Payload = Record<string, unknown>;

// Only defaults supplied by the old schema (or additive, nullable fields) belong
// here. Never invent a measurement, score, timestamp, or successful job outcome.
const defaults: Partial<Record<TargetTable, Payload>> = {
  prompts: { category: null, isFavorite: false, aiGenerated: false, metadata: {} },
  forumThreads: {
    productId: null, text: null, subreddit: null, author: null,
    score: 0, numComments: 0, opportunityScore: 0, scoreBreakdown: {},
    commentDraft: null, postedAt: null, postedBy: null, discoveredAt: null, externalCreatedAt: null,
  },
  redditAccounts: { postsToday: 0, lastPostAt: null },
  contentAnalyses: { title: null, schemaPresent: [], recommendations: [] },
  scheduledScans: { competitors: [], lastRunAt: null, claimToken: null, claimExpiresAt: null, lastRunStatus: null },
  analyticsEvents: { referrer: null, aiSource: null, path: null, metadata: {} },
  alertPreferences: { enabled: true },
  notifications: { read: false, metadata: {}, dedupeKey: null },
  actions: {
    ownerId: null, forumThreadId: null, description: null, actionUrl: null,
    hypothesis: null, sourceUrl: null, priority: 'medium', targetPrompts: [], targetEngines: [],
    insightKey: null, actionTakenAt: null, baselineSnapshot: {}, impactSnapshot: {}, impactSummary: {},
  },
  actionEvents: { actorId: null, fromStatus: null, toStatus: null, changes: {} },
  sentimentDriftSnapshots: {
    providerModel: null, measurementRegion: null, measurementMode: null,
    scorerVersion: null, measurementContractVersion: null,
  },
  competitorAttributes: { scanId: null, confidence: null },
  accuracyClaims: { confidence: null, evidenceUrl: null, evidenceSnippet: null, reasoning: null },
  decisionPackets: { createdBy: null },
  weeklyDigestDeliveries: { lastError: null, sentAt: null },
  measurementJobs: { claimToken: null, claimExpiresAt: null, lastError: null, completedAt: null },
  experiments: { hypothesis: null, testQuestions: [], controlQuestions: [], baselineData: {}, resultData: {} },
  newsletterSubscribers: { source: null, unsubscribedAt: null },
};

const relations = {
  organizationPublicId: ['organizations', 'organizationId'],
  workspacePublicId: ['workspaces', 'workspaceId'],
  productPublicId: ['products', 'productId'],
  scanPublicId: ['scans', 'scanId'],
  forumThreadPublicId: ['forumThreads', 'forumThreadId'],
  actionPublicId: ['actions', 'actionId'],
  ownerPublicId: ['users', 'ownerId'],
  actorPublicId: ['users', 'actorId'],
  createdByPublicId: ['users', 'createdBy'],
} as const;

async function parentByPublicId(ctx: MutationCtx, table: 'workspaces', value: unknown): Promise<Doc<'workspaces'>>;
async function parentByPublicId(ctx: MutationCtx, table: ParentTable, value: unknown): Promise<Doc<ParentTable>>;
async function parentByPublicId(ctx: MutationCtx, table: ParentTable, value: unknown) {
  if (typeof value !== 'string' || !value) throw new Error(`invalid_import_parent:${table}`);
  const parent = await ctx.db.query(table)
    .withIndex('by_public_id', (q) => q.eq('publicId', value)).unique();
  if (!parent) throw new Error(`missing_import_parent:${table}`);
  return parent;
}

export async function materializeRemainingRecord(
  ctx: MutationCtx,
  source: RemainingSourceTable,
  payload: Payload,
): Promise<void> {
  const target = remainingImportTables[source];
  const fields = schema.tables[target].validator.fields;
  const value: Payload = { ...defaults[target] };
  const parents: Array<Doc<ParentTable>> = [];
  let workspace: Doc<'workspaces'> | null = null;

  if ('workspaceId' in fields) {
    workspace = await parentByPublicId(ctx, 'workspaces', payload.workspacePublicId);
  }
  for (const [key, fieldValue] of Object.entries(payload)) {
    const relation = Object.hasOwn(relations, key) ? relations[key as keyof typeof relations] : undefined;
    if (relation) {
      const [table, destination] = relation;
      if (!Object.hasOwn(fields, destination)) throw new Error(`unexpected_import_relation:${key}`);
      if (fieldValue === null) value[destination] = null;
      else {
        const parent = await parentByPublicId(ctx, table, fieldValue);
        parents.push(parent);
        value[destination] = parent._id;
      }
    } else if (Object.hasOwn(fields, key)) {
      // Source records may only refer to parents by their exported public IDs.
      if (Object.values(relations).some(([, destination]) => destination === key)) {
        throw new Error(`raw_import_foreign_key:${key}`);
      }
      value[key] = fieldValue;
    } else {
      throw new Error(`unexpected_import_field:${source}:${key}`);
    }
  }

  if (workspace) {
    for (const parent of parents) {
      if ('workspaceId' in parent && parent.workspaceId !== workspace._id) {
        throw new Error('import_workspace_mismatch');
      }
      if ('organizationId' in parent && parent.organizationId !== workspace.organizationId) {
        throw new Error('import_organization_mismatch');
      }
    }
    for (const key of ['ownerId', 'actorId', 'createdBy']) {
      if (!value[key]) continue;
      // Historical owners/actors can have left the organization. Do not grant
      // membership on import; require their current tenant to match instead.
      const membership = await ctx.db.query('memberships')
        .withIndex('by_organization_id_and_user_id', (q) =>
          q.eq('organizationId', workspace.organizationId).eq('userId', value[key] as Id<'users'>))
        .unique();
      if (!membership) throw new Error(`import_actor_organization_mismatch:${key}`);
    }
  }

  if (target === 'newsletterSubscribers') {
    if (typeof value.email !== 'string') throw new Error('invalid_import_field:email');
    value.normalizedEmail = value.email.trim().toLowerCase();
  }
  await upsertValidatedRecord(ctx, target, value);
}

async function upsertValidatedRecord(ctx: MutationCtx, table: TargetTable, value: Payload) {
  // Runtime validation uses the exact destination schema. IDs were resolved from
  // real parent documents above; Convex also validates the destination on writes.
  if (!validate(schema.tables[table].validator, value)) {
    throw new Error(`invalid_import_record:${table}`);
  }
  const existing = await ctx.db.query(table)
    .withIndex('by_public_id', (q) => q.eq('publicId', value.publicId)).unique();
  if (existing) {
    if ('workspaceId' in existing && 'workspaceId' in value && existing.workspaceId !== value.workspaceId) {
      throw new Error('import_workspace_reassignment');
    }
    if ('organizationId' in existing && 'organizationId' in value && existing.organizationId !== value.organizationId) {
      throw new Error('import_organization_reassignment');
    }
    await ctx.db.replace(existing._id, value);
  } else await ctx.db.insert(table, value);
}
