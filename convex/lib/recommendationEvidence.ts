import type { Doc } from '../_generated/dataModel';
import { matchesBrand } from '../../lib/ai/brand-matching';

type RecommendationStatus = NonNullable<Doc<'scans'>['recommendationStatus']>;

/** An old or malformed classifier result must never become a recommendation claim. */
export function recommendationEvidence(input: {
  status?: RecommendationStatus;
  evidence?: string | null;
  method?: string | null;
  response: string;
  brandName: string;
  brandMentioned: boolean;
}) {
  if (!input.brandMentioned) return { recommendationStatus: 'not_mentioned' as const, recommendationEvidence: null, recommendationMethod: null };
  const evidence = input.evidence?.trim() ?? '';
  if ((input.status === 'recommended' || input.status === 'not_recommended') &&
    evidence.length > 0 && evidence.length <= 300 && input.response.includes(evidence) &&
    matchesBrand(evidence, [input.brandName]).matched) {
    return { recommendationStatus: input.status, recommendationEvidence: evidence, recommendationMethod: input.method ?? null };
  }
  return { recommendationStatus: 'unassessed' as const, recommendationEvidence: null, recommendationMethod: null };
}
