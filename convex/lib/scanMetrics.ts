import { v } from 'convex/values';
import { engineValidator, measurementModeValidator, nullableString, nullableNumber, sentimentValidator } from '../validators';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

export const metricObservation = v.object({ prompt: v.string(), platform: engineValidator, hasEvidence: v.boolean(), brand_mentioned: v.boolean(),
  mention_position: nullableNumber, competitors_mentioned: v.optional(v.array(v.string())), sentiment: v.union(sentimentValidator, v.null()), created_at: v.string(),
  provider_model: nullableString, measurement_region: nullableString, measurement_mode: v.union(measurementModeValidator, v.null()), scorer_version: nullableString,
  measurement_contract_version: nullableString, search_mode: nullableString, analyzer_method: nullableString, analyzer_model: nullableString, analyzer_prompt_version: nullableString });

/** Compact comparison input, written atomically with the full immutable scan. */
export async function upsertScanMetric(ctx: MutationCtx, scanId: Id<'scans'>, row: Omit<Doc<'scans'>, '_id' | '_creationTime'>) {
  const existing = await ctx.db.query('scanMetrics').withIndex('by_scan', q => q.eq('scanId', scanId)).unique();
  const value = { scanId, workspaceId: row.workspaceId, prompt: row.prompt, platform: row.platform,
    measurementRunId: row.measurementRunId, createdAt: row.createdAt, observation: {
      prompt: row.prompt, platform: row.platform, hasEvidence: !row.failureCode && Boolean(row.response.trim()),
      brand_mentioned: row.brandMentioned, mention_position: row.mentionPosition, competitors_mentioned: row.competitorsMentioned,
      sentiment: row.sentiment, created_at: new Date(row.createdAt).toISOString(),
      provider_model: row.providerModel, measurement_region: row.measurementRegion, measurement_mode: row.measurementMode,
      scorer_version: row.scorerVersion, measurement_contract_version: row.measurementContractVersion, search_mode: row.searchMode ?? null,
      analyzer_method: row.analyzerMethod, analyzer_model: row.analyzerModel, analyzer_prompt_version: row.analyzerPromptVersion ?? null,
    } };
  if (existing) await ctx.db.replace(existing._id, value);
  else await ctx.db.insert('scanMetrics', value);
}
