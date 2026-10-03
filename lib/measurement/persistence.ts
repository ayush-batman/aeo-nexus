import type { ScanResult } from '@/lib/ai/llm-scanner';

export function scanResultPersistenceRow(workspaceId: string, result: ScanResult): Record<string, unknown> {
  return {
    workspace_id: workspaceId,
    platform: result.platform,
    prompt: result.prompt,
    response: result.response,
    brand_mentioned: result.brandMentioned,
    brand_variants: result.brandVariants,
    mention_position: result.mentionPosition,
    sentiment: result.sentiment,
    sentiment_score: result.sentimentScore,
    sentiment_reason: result.sentimentReason,
    competitors_mentioned: result.competitorsMentioned,
    citations: result.citations,
    list_items: result.listItems,
    confidence: result.confidence,
    winner: 'winner' in result ? result.winner : null,
    winner_reason: 'winnerReason' in result ? result.winnerReason : null,
    measurement_run_id: result.measurementRunId ?? null,
    measurement_contract_version: result.measurementContractVersion ?? null,
    sample_number: result.sampleNumber ?? null,
    provider_model: result.providerModel ?? null,
    measurement_region: result.measurementRegion ?? null,
    measurement_mode: result.measurementMode ?? null,
    scorer_version: result.scorerVersion ?? null,
  };
}
