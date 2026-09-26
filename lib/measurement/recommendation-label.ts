export type RecommendationStatus = 'recommended' | 'not_recommended' | 'unassessed' | 'not_mentioned' | null | undefined;

export function recommendationLabel(status: RecommendationStatus): string {
  if (status === 'recommended') return 'Recommended in this answer';
  if (status === 'not_recommended') return 'Named, but not recommended';
  return 'Recommendation not assessed';
}
