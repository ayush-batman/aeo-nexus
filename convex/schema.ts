import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

import {
  actionStatusValidator,
  citationValidator,
  engineValidator,
  measurementJobStatusValidator,
  measurementModeValidator,
  measurementStatusValidator,
  nullableNumber,
  nullableString,
  planValidator,
  priorityValidator,
  roleValidator,
  sentimentValidator,
} from './validators';

export default defineSchema({
  organizations: defineTable({
    publicId: v.string(),
    name: v.string(),
    plan: planValidator,
    stripeCustomerId: nullableString,
    stripeSubscriptionId: nullableString,
    razorpaySubscriptionId: nullableString,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_stripe_customer_id', ['stripeCustomerId'])
    .index('by_stripe_subscription_id', ['stripeSubscriptionId'])
    .index('by_razorpay_subscription_id', ['razorpaySubscriptionId']),

  users: defineTable({
    publicId: v.string(),
    authSubject: nullableString,
    email: v.string(),
    normalizedEmail: v.string(),
    emailVerified: v.boolean(),
    fullName: nullableString,
    avatarUrl: nullableString,
    onboardingCompleted: v.boolean(),
    isSuperAdmin: v.boolean(),
    legacySupabaseId: nullableString,
    claimedAt: nullableNumber,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_auth_subject', ['authSubject'])
    .index('by_normalized_email', ['normalizedEmail'])
    .index('by_legacy_supabase_id', ['legacySupabaseId']),

  memberships: defineTable({
    publicId: v.string(),
    organizationId: v.id('organizations'),
    userId: v.id('users'),
    role: roleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_organization_id_and_user_id', ['organizationId', 'userId'])
    .index('by_user_id', ['userId'])
    .index('by_organization_id', ['organizationId']),

  workspaces: defineTable({
    publicId: v.string(),
    organizationId: v.id('organizations'),
    name: v.string(),
    logoUrl: nullableString,
    settings: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_organization_id', ['organizationId'])
    .index('by_organization_id_and_created_at', ['organizationId', 'createdAt']),

  products: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    name: v.string(),
    website: nullableString,
    description: nullableString,
    keywords: v.array(v.string()),
    competitors: v.any(),
    knowledgeBase: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id', ['workspaceId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt']),

  scans: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    platform: engineValidator,
    prompt: v.string(),
    response: v.string(),
    brandMentioned: v.boolean(),
    brandVariants: v.array(v.string()),
    mentionPosition: nullableNumber,
    sentiment: v.union(sentimentValidator, v.null()),
    sentimentScore: nullableNumber,
    sentimentReason: nullableString,
    competitorsMentioned: v.array(v.string()),
    listItems: v.array(v.string()),
    analyzerConfidence: nullableNumber,
    analyzerMethod: nullableString,
    analyzerModel: nullableString,
    citations: v.array(citationValidator),
    winner: nullableString,
    winnerReason: nullableString,
    measurementRunId: nullableString,
    measurementContractVersion: nullableString,
    sampleNumber: nullableNumber,
    providerModel: nullableString,
    measurementRegion: nullableString,
    measurementMode: v.union(measurementModeValidator, v.null()),
    scorerVersion: nullableString,
    failureCode: nullableString,
    failureMessage: nullableString,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_id_and_measurement_run_id', ['workspaceId', 'measurementRunId'])
    .index('by_workspace_id_prompt_platform_created_at', [
      'workspaceId',
      'prompt',
      'platform',
      'createdAt',
    ]),

  forumThreads: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    productId: v.union(v.id('products'), v.null()),
    platform: v.string(),
    externalId: v.string(),
    url: v.string(),
    title: v.string(),
    text: nullableString,
    subreddit: nullableString,
    author: nullableString,
    score: v.number(),
    numComments: v.number(),
    opportunityScore: v.number(),
    scoreBreakdown: v.any(),
    status: v.string(),
    commentDraft: nullableString,
    postedAt: nullableNumber,
    postedBy: nullableString,
    discoveredAt: nullableNumber,
    externalCreatedAt: nullableNumber,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_platform_external_id', ['workspaceId', 'platform', 'externalId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_id_and_status', ['workspaceId', 'status']),

  redditAccounts: defineTable({
    publicId: v.string(),
    organizationId: v.id('organizations'),
    username: v.string(),
    postsToday: v.number(),
    lastPostAt: nullableNumber,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_organization_id_and_username', ['organizationId', 'username']),

  contentAnalyses: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    url: v.string(),
    title: nullableString,
    aeloScore: v.number(),
    readabilityScore: v.number(),
    eeatScore: v.number(),
    schemaPresent: v.array(v.string()),
    recommendations: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_id_and_url', ['workspaceId', 'url']),

  scheduledScans: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    prompt: v.string(),
    platforms: v.array(engineValidator),
    competitors: v.array(v.string()),
    frequency: v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly')),
    lastRunAt: nullableNumber,
    nextRunAt: v.number(),
    status: v.union(v.literal('active'), v.literal('paused')),
    claimToken: nullableString,
    claimExpiresAt: nullableNumber,
    lastRunStatus: nullableString,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_status_and_next_run_at', ['status', 'nextRunAt']),

  prompts: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    prompt: v.string(),
    category: nullableString,
    isFavorite: v.boolean(),
    aiGenerated: v.boolean(),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_id_and_category', ['workspaceId', 'category']),

  analyticsEvents: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    eventType: v.string(),
    referrer: nullableString,
    aiSource: nullableString,
    path: nullableString,
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_ai_source_and_created_at', ['aiSource', 'createdAt']),

  alertPreferences: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    alertType: v.string(),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_alert_type', ['workspaceId', 'alertType']),

  notifications: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    metadata: v.any(),
    dedupeKey: nullableString,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_id_and_read', ['workspaceId', 'read'])
    .index('by_workspace_id_and_dedupe_key', ['workspaceId', 'dedupeKey']),

  actions: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    ownerId: v.union(v.id('users'), v.null()),
    forumThreadId: v.union(v.id('forumThreads'), v.null()),
    actionType: v.string(),
    title: v.string(),
    description: nullableString,
    actionUrl: nullableString,
    hypothesis: nullableString,
    sourceUrl: nullableString,
    priority: priorityValidator,
    targetPrompts: v.array(v.string()),
    targetEngines: v.array(engineValidator),
    insightKey: nullableString,
    status: actionStatusValidator,
    actionTakenAt: nullableNumber,
    baselineSnapshot: v.any(),
    impactSnapshot: v.any(),
    impactSummary: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_id_and_status', ['workspaceId', 'status'])
    .index('by_workspace_id_and_insight_key', ['workspaceId', 'insightKey']),

  actionEvents: defineTable({
    publicId: v.string(),
    actionId: v.id('actions'),
    workspaceId: v.id('workspaces'),
    actorId: v.union(v.id('users'), v.null()),
    eventType: v.union(
      v.literal('created'),
      v.literal('updated'),
      v.literal('status_changed'),
      v.literal('measured'),
    ),
    fromStatus: v.union(actionStatusValidator, v.null()),
    toStatus: v.union(actionStatusValidator, v.null()),
    changes: v.any(),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_action_id_and_idempotency_key', ['actionId', 'idempotencyKey'])
    .index('by_action_id_and_created_at', ['actionId', 'createdAt'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt']),

  newsletterSubscribers: defineTable({
    publicId: v.string(),
    email: v.string(),
    normalizedEmail: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('unsubscribed'),
      v.literal('bounced'),
    ),
    source: nullableString,
    unsubscribeTokenHash: v.string(),
    subscribedAt: v.number(),
    unsubscribedAt: nullableNumber,
  })
    .index('by_public_id', ['publicId'])
    .index('by_normalized_email', ['normalizedEmail'])
    .index('by_status_and_subscribed_at', ['status', 'subscribedAt'])
    .index('by_unsubscribe_token_hash', ['unsubscribeTokenHash']),

  publicScans: defineTable({
    publicId: v.string(),
    ipHash: v.string(),
    brandName: v.string(),
    prompt: v.string(),
    platform: engineValidator,
    response: nullableString,
    brandMentioned: v.union(v.boolean(), v.null()),
    mentionPosition: nullableNumber,
    sentiment: v.union(sentimentValidator, v.null()),
    competitorsMentioned: v.array(v.string()),
    citations: v.array(citationValidator),
    errorMessage: nullableString,
    email: nullableString,
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_ip_hash_and_created_at', ['ipHash', 'createdAt'])
    .index('by_expires_at', ['expiresAt']),

  sentimentDriftSnapshots: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    prompt: v.string(),
    platform: engineValidator,
    weekStart: v.string(),
    avgSentiment: v.number(),
    sampleSize: v.number(),
    providerModel: nullableString,
    measurementRegion: nullableString,
    measurementMode: v.union(measurementModeValidator, v.null()),
    scorerVersion: nullableString,
    measurementContractVersion: nullableString,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_week_start', ['workspaceId', 'weekStart'])
    .index('by_compatible_week', [
      'workspaceId',
      'prompt',
      'platform',
      'providerModel',
      'measurementRegion',
      'measurementMode',
      'scorerVersion',
      'measurementContractVersion',
      'weekStart',
    ]),

  competitorAttributes: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    scanId: v.union(v.id('scans'), v.null()),
    entityName: v.string(),
    entityType: v.union(v.literal('brand'), v.literal('competitor')),
    attribute: v.string(),
    platform: engineValidator,
    confidence: nullableNumber,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_workspace_entity_attribute', ['workspaceId', 'entityName', 'attribute'])
    .index('by_scan_id', ['scanId']),

  accuracyClaims: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    scanId: v.id('scans'),
    claimText: v.string(),
    verdict: v.union(
      v.literal('true'),
      v.literal('false'),
      v.literal('outdated'),
      v.literal('unverified'),
    ),
    confidence: nullableNumber,
    evidenceUrl: nullableString,
    evidenceSnippet: nullableString,
    reasoning: nullableString,
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_scan_id', ['scanId'])
    .index('by_workspace_id_and_verdict', ['workspaceId', 'verdict']),

  apiKeys: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    organizationId: v.id('organizations'),
    createdBy: v.id('users'),
    name: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    scopes: v.array(v.string()),
    lastUsedAt: nullableNumber,
    createdAt: v.number(),
    revokedAt: nullableNumber,
  })
    .index('by_public_id', ['publicId'])
    .index('by_key_hash', ['keyHash'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt'])
    .index('by_organization_id', ['organizationId']),

  billingWebhookEvents: defineTable({
    publicId: v.string(),
    provider: v.union(v.literal('stripe'), v.literal('razorpay')),
    eventId: v.string(),
    eventType: v.string(),
    organizationId: v.id('organizations'),
    plan: planValidator,
    providerSubscriptionId: nullableString,
    occurredAt: nullableNumber,
    appliedAt: v.number(),
    changedOrganization: v.boolean(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_provider_and_event_id', ['provider', 'eventId'])
    .index('by_provider_organization_occurred_at', ['provider', 'organizationId', 'occurredAt']),

  scanQuotaReservations: defineTable({
    publicId: v.string(),
    organizationId: v.id('organizations'),
    requestId: v.string(),
    units: v.number(),
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_organization_id_and_request_id', ['organizationId', 'requestId'])
    .index('by_organization_id_and_created_at', ['organizationId', 'createdAt']),

  decisionPackets: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    contractVersion: v.string(),
    status: measurementStatusValidator,
    prompts: v.any(),
    packet: v.any(),
    createdBy: v.union(v.id('users'), v.null()),
    createdAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt']),

  weeklyDigestDeliveries: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    weekStart: v.string(),
    status: v.union(v.literal('sending'), v.literal('sent'), v.literal('failed')),
    itemCount: v.number(),
    recipientCount: v.number(),
    lastError: nullableString,
    attemptedAt: v.number(),
    sentAt: nullableNumber,
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_week_start', ['workspaceId', 'weekStart']),

  measurementJobs: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    organizationId: v.id('organizations'),
    purpose: v.literal('initial_visibility'),
    status: measurementJobStatusValidator,
    attempts: v.number(),
    maxAttempts: v.number(),
    availableAt: v.number(),
    claimToken: nullableString,
    claimExpiresAt: nullableNumber,
    lastError: nullableString,
    result: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: nullableNumber,
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_purpose', ['workspaceId', 'purpose'])
    .index('by_status_and_available_at', ['status', 'availableAt'])
    .index('by_organization_id_and_created_at', ['organizationId', 'createdAt']),

  experiments: defineTable({
    publicId: v.string(),
    workspaceId: v.id('workspaces'),
    name: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('cancelled'),
    ),
    hypothesis: nullableString,
    testQuestions: v.array(v.string()),
    controlQuestions: v.array(v.string()),
    baselineData: v.any(),
    resultData: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_workspace_id_and_created_at', ['workspaceId', 'createdAt']),

  importRuns: defineTable({
    publicId: v.string(),
    manifestHash: v.string(),
    status: v.union(
      v.literal('running'),
      v.literal('complete'),
      v.literal('failed'),
    ),
    sourceLabel: v.string(),
    counts: v.any(),
    lastError: nullableString,
    startedAt: v.number(),
    completedAt: nullableNumber,
  })
    .index('by_public_id', ['publicId'])
    .index('by_manifest_hash', ['manifestHash']),
});
