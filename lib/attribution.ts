export const ATTRIBUTION_SOURCES = ['chatgpt', 'gemini', 'perplexity', 'claude', 'ai_assistant', 'ai_search', 'google_search', 'social_media', 'referral', 'direct', 'other'];
export type SurveyResponse = { source: string; timestamp: string; customSource?: string | null };
export function attributionSummary(responses: SurveyResponse[]) {
  const counts = new Map<string, number>(); let aiInfluenced = 0;
  for (const row of responses) {
    counts.set(row.source, (counts.get(row.source) || 0)+1);
    if (ATTRIBUTION_SOURCES.slice(0,6).includes(row.source)) aiInfluenced++;
  }
  const total = responses.length;
  return { total, aiInfluenced, aiInfluencedPercentage: total ? Math.round(aiInfluenced/total*100) : null,
    sources: [...counts].map(([source, count]) => ({ source, count, percentage: Math.round(count/total*100) })).sort((a,b) => b.count-a.count),
    recentResponses: [...responses].sort((a,b) => b.timestamp.localeCompare(a.timestamp)).slice(0,20) };
}
