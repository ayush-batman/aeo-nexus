import type { Doc } from '../../convex/_generated/dataModel';
import type { LLMScan, ForumThread } from '../types';

const iso = (value: number | null) => value === null ? null : new Date(value).toISOString();

export function legacyScan(row: Doc<'scans'>, workspaceId: string): LLMScan {
  return { id: row.publicId, workspace_id: workspaceId, platform: row.platform,
    prompt: row.prompt, response: row.response, brand_mentioned: row.brandMentioned,
    mention_position: row.mentionPosition, sentiment: row.sentiment, competitors_mentioned: row.competitorsMentioned,
    citations: row.citations.map((citation) => ({ url: citation.url, title: citation.title,
      is_own_domain: citation.isOwnDomain, provenance: citation.provenance, provider: citation.provider,
      sample_id: citation.sampleId, raw_provider_reference: citation.rawProviderReference,
      fetch_validation: citation.fetchValidation })),
    sample_id: row.sampleId ?? row.citations[0]?.sampleId ?? null,
    sample_index: row.sampleNumber, sample_number: row.sampleNumber,
    measurement_run_id: row.measurementRunId, provider_model: row.providerModel,
    measurement_region: row.measurementRegion, measurement_mode: row.measurementMode,
    scorer_version: row.scorerVersion, measurement_contract_version: row.measurementContractVersion,
    search_mode: row.searchMode ?? null, analyzer_method: row.analyzerMethod,
    analyzer_model: row.analyzerModel, analyzer_prompt_version: row.analyzerPromptVersion ?? null,
    failure_code: row.failureCode, created_at: new Date(row.createdAt).toISOString() };
}

export function legacyThread(row: Doc<'forumThreads'>, workspaceId: string): ForumThread {
  const knownPlatform = ['reddit', 'quora', 'teambhp', 'xbhp', 'youtube'] as const;
  const platform = knownPlatform.find((value) => value === row.platform) ?? 'other';
  const knownStatus = ['discovered', 'queued', 'drafted', 'posted', 'skipped'] as const;
  const status = knownStatus.find((value) => value === row.status) ?? 'discovered';
  return { id: row.publicId, workspace_id: workspaceId, platform, status,
    external_id: row.externalId, url: row.url, title: row.title, text: row.text,
    subreddit: row.subreddit, author: row.author, score: row.score, num_comments: row.numComments,
    opportunity_score: row.opportunityScore, score_breakdown: row.scoreBreakdown,
    product_id: row.productId, comment_draft: row.commentDraft, posted_at: iso(row.postedAt),
    posted_by: row.postedBy, discovered_at: iso(row.discoveredAt), external_created_at: iso(row.externalCreatedAt),
    created_at: new Date(row.createdAt).toISOString() };
}
