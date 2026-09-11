import { v } from 'convex/values';

import { summarizeDashboardObservations } from '../lib/measurement/dashboard-summary';
import { tenantQuery, requireWorkspace } from './lib/tenant';
import { planValidator } from './validators';
import { nullableNumber, sentimentValidator } from './validators';

const DAY_MS = 86_400_000;
const MAX_OBSERVATIONS = 5_000;
const MAX_SUPPORTING_ROWS = 1_000;
const MAX_RUNS = 1_000;

const confidenceValidator = v.object({
  level: v.union(v.literal('none'), v.literal('low'), v.literal('medium'), v.literal('high')),
  sampleCount: v.number(),
  mentions: v.number(),
  mentionRate: nullableNumber,
  interval: v.union(v.null(), v.object({
    lower: v.number(),
    upper: v.number(),
    confidence: v.number(),
    method: v.literal('wilson'),
  })),
});

const visibilityMetricValidator = v.object({
  platform: v.string(),
  score: nullableNumber,
  change: nullableNumber,
  changeStatus: v.union(v.literal('comparable'), v.literal('incompatible'), v.literal('insufficient_samples')),
  scanCount: v.number(),
  mentionCount: v.number(),
  mentionRate: nullableNumber,
  confidence: confidenceValidator,
  averageMentionPosition: nullableNumber,
  mentionPositionCount: v.number(),
  mentionPositionTotal: v.number(),
  comparisonCurrentSamples: v.number(),
  comparisonCurrentMentions: v.number(),
  comparisonPreviousSamples: v.number(),
  comparisonPreviousMentions: v.number(),
});

const bootstrapWorkspace = v.object({
  id: v.string(),
  name: v.string(),
  settings: v.any(),
  created_at: v.string(),
});

export const bootstrap = tenantQuery({
  args: { activeWorkspacePublicId: v.union(v.string(), v.null()) },
  returns: v.union(v.null(), v.object({
    userId: v.string(),
    orgId: v.string(),
    workspaceId: v.string(),
    onboardingCompleted: v.boolean(),
    hasBrand: v.boolean(),
    plan: planValidator,
    paid: v.boolean(),
    workspaces: v.array(bootstrapWorkspace),
  })),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query('workspaces').withIndex('by_organization_id_and_created_at', (q) =>
      q.eq('organizationId', ctx.tenant.organization._id)).order('desc').take(100);
    if (!rows.length) return null;
    const active = rows.find((row) => row.publicId === args.activeWorkspacePublicId) ?? rows[0];
    const product = await ctx.db.query('products').withIndex('by_workspace_id', (q) =>
      q.eq('workspaceId', active._id)).first();
    return {
      userId: ctx.tenant.user.publicId,
      orgId: ctx.tenant.organization.publicId,
      workspaceId: active.publicId,
      onboardingCompleted: ctx.tenant.user.onboardingCompleted,
      hasBrand: Boolean(product),
      plan: ctx.tenant.organization.plan,
      paid: ctx.tenant.organization.plan !== 'free',
      workspaces: rows.map((row) => ({
        id: row.publicId,
        name: row.name,
        settings: row.settings,
        created_at: new Date(row.createdAt).toISOString(),
      })),
    };
  },
});

export const summary = tenantQuery({
  args: { workspaceId: v.string(), asOf: v.number() },
  returns: v.object({
    status: v.union(v.literal('complete'), v.literal('partial')),
    partialReasons: v.array(v.string()),
    stats: v.object({
      aeoHealthScore: nullableNumber,
      aeoScoreChange: nullableNumber,
      llmVisibility: nullableNumber,
      llmVisibilityChange: nullableNumber,
      llmVisibilitySamples: v.number(),
      llmVisibilityMentions: v.number(),
      llmVisibilityConfidence: v.union(v.literal('none'), v.literal('low'), v.literal('medium'), v.literal('high')),
      forumThreadCount: nullableNumber,
      highPriorityThreads: nullableNumber,
      shareOfVoice: nullableNumber,
      shareOfVoiceChange: nullableNumber,
      contentScore: nullableNumber,
      pagesNeedingOptimization: nullableNumber,
    }),
    recentMentions: v.array(v.object({
      id: v.string(),
      platform: v.string(),
      prompt: v.string(),
      sentiment: v.union(sentimentValidator, v.null()),
      createdAt: v.string(),
    })),
    visibilityMetrics: v.array(visibilityMetricValidator),
    topThreads: v.array(v.object({
      id: v.string(),
      title: v.string(),
      subreddit: v.union(v.string(), v.null()),
      opportunity_score: v.number(),
      platform: v.string(),
    })),
  }),
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.asOf) || args.asOf < 0) throw new Error('invalid_dashboard_time');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const now = args.asOf;
    const [observationRows, runRows, threadRows, contentRows] = await Promise.all([
      ctx.db.query('scanMetrics').withIndex('by_workspace_created', (q) =>
        q.eq('workspaceId', workspace._id).gte('createdAt', now - 14 * DAY_MS))
        .order('desc').take(MAX_OBSERVATIONS + 1),
      ctx.db.query('measurementRuns').withIndex('by_workspace_created_at', (q) =>
        q.eq('workspaceId', workspace._id).gte('createdAt', now - 14 * DAY_MS))
        .order('desc').take(MAX_RUNS + 1),
      ctx.db.query('forumThreads').withIndex('by_workspace_opportunity', (q) =>
        q.eq('workspaceId', workspace._id)).order('desc').take(MAX_SUPPORTING_ROWS + 1),
      ctx.db.query('contentAnalyses').withIndex('by_workspace_id_and_created_at', (q) =>
        q.eq('workspaceId', workspace._id)).order('desc').take(MAX_SUPPORTING_ROWS + 1),
    ]);
    const observationsTruncated = observationRows.length > MAX_OBSERVATIONS;
    const runsTruncated = runRows.length > MAX_RUNS;
    const threadsTruncated = threadRows.length > MAX_SUPPORTING_ROWS;
    const contentTruncated = contentRows.length > MAX_SUPPORTING_ROWS;
    const observations = observationRows.slice(0, MAX_OBSERVATIONS);
    const threads = threadRows.slice(0, MAX_SUPPORTING_ROWS);
    const content = contentRows.slice(0, MAX_SUPPORTING_ROWS);
    const measurement = summarizeDashboardObservations({
      now,
      truncated: observationsTruncated,
      partialEvidence: runsTruncated || runRows.slice(0, MAX_RUNS).some((row) =>
        row.createdAt >= now - 7 * DAY_MS && row.status !== 'complete'),
      observations: observations.map((row) => ({
        prompt: row.observation.prompt,
        platform: row.observation.platform,
        hasEvidence: row.observation.hasEvidence,
        brandMentioned: row.observation.brand_mentioned,
        mentionPosition: row.observation.mention_position,
        competitorsMentioned: row.observation.competitors_mentioned,
        providerModel: row.observation.provider_model,
        region: row.observation.measurement_region,
        mode: row.observation.measurement_mode,
        scorerVersion: row.observation.scorer_version,
        contractVersion: row.observation.measurement_contract_version,
        searchMode: row.observation.search_mode,
        analyzerMethod: row.observation.analyzer_method,
        analyzerModel: row.observation.analyzer_model,
        analyzerPromptVersion: row.observation.analyzer_prompt_version,
        createdAt: row.createdAt,
      })),
    });
    const recentMetricRows = observations
      .filter((row) => row.observation.hasEvidence && row.observation.brand_mentioned)
      .slice(0, 5);
    const recentScanRows = await Promise.all(recentMetricRows.map((row) => ctx.db.get(row.scanId)));
    const recentMentions = recentScanRows.flatMap((row) => row ? [{
      id: row.publicId,
      platform: row.platform === 'chatgpt' ? 'ChatGPT' : row.platform.charAt(0).toUpperCase() + row.platform.slice(1),
      prompt: row.prompt,
      sentiment: row.sentiment,
      createdAt: new Date(row.createdAt).toISOString(),
    }] : []);
    const supportingPartialReasons = [
      ...(threadsTruncated ? ['forum_threads_truncated'] : []),
      ...(contentTruncated ? ['content_analyses_truncated'] : []),
    ];
    const contentScore = content.length && !contentTruncated
      ? Math.round(content.reduce((sum, row) => sum + row.aeloScore, 0) / content.length)
      : null;

    return {
      status: measurement.status === 'partial' || supportingPartialReasons.length ? 'partial' as const : 'complete' as const,
      partialReasons: [...measurement.partialReasons, ...supportingPartialReasons],
      stats: {
        ...measurement.stats,
        forumThreadCount: threadsTruncated ? null : threads.length,
        highPriorityThreads: threadsTruncated ? null : threads.filter((row) => row.opportunityScore >= 70).length,
        contentScore,
        pagesNeedingOptimization: contentTruncated ? null : content.filter((row) => row.aeloScore < 60).length,
      },
      recentMentions,
      visibilityMetrics: measurement.visibilityMetrics,
      topThreads: threads.filter((row) => row.opportunityScore >= 50).slice(0, 3).map((row) => ({
        id: row.publicId,
        title: row.title,
        subreddit: row.subreddit,
        opportunity_score: row.opportunityScore,
        platform: row.platform,
      })),
    };
  },
});
