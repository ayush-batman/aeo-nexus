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
  };
}
