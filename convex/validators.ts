import { v } from 'convex/values';

export const roleValidator = v.union(
  v.literal('owner'),
  v.literal('admin'),
  v.literal('editor'),
  v.literal('viewer'),
);

export const planValidator = v.union(
  v.literal('free'),
  v.literal('starter'),
  v.literal('pro'),
  v.literal('agency'),
  v.literal('enterprise'),
);

export const engineValidator = v.union(
  v.literal('chatgpt'),
  v.literal('perplexity'),
  v.literal('claude'),
  v.literal('gemini'),
  v.literal('google_ai'),
  v.literal('google_ai_overview'),
  v.literal('bing_copilot'),
  v.literal('mock'),
);

export const measurementModeValidator = v.union(
  v.literal('standard'),
  v.literal('battle'),
);

export const measurementStatusValidator = v.union(
  v.literal('complete'),
  v.literal('partial'),
  v.literal('all_failed'),
  v.literal('untracked'),
);

export const citationProvenanceValidator = v.union(
  v.literal('provider_citation'),
  v.literal('link_mentioned'),
  v.literal('unverified'),
);

export const citationFetchValidationValidator = v.union(
  v.literal('not_checked'),
  v.literal('valid'),
  v.literal('invalid'),
  v.literal('blocked'),
);

export const citationValidator = v.object({
  url: v.string(),
  title: v.string(),
  isOwnDomain: v.boolean(),
  provenance: citationProvenanceValidator,
  provider: v.string(),
  sampleId: v.string(),
  rawProviderReference: v.any(),
  fetchValidation: citationFetchValidationValidator,
});

export const sentimentValidator = v.union(
  v.literal('positive'),
  v.literal('neutral'),
  v.literal('negative'),
);

export const actionStatusValidator = v.union(
  v.literal('planned'),
  v.literal('in_progress'),
  v.literal('completed'),
  v.literal('measured'),
);

export const priorityValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
);

export const measurementJobStatusValidator = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('partial'),
  v.literal('failed'),
  v.literal('skipped'),
);

export const nullableString = v.union(v.string(), v.null());
export const nullableNumber = v.union(v.number(), v.null());
