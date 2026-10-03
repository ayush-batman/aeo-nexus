export type ActivityVerification = {
  status: 'verified' | 'not_detected' | 'inconclusive';
  totalVisits: number;
  aiVisits: number;
  examinedEvents: number;
  partial: boolean;
};

export function classifyActivitySummary(data: unknown): ActivityVerification {
  if (!data || typeof data !== 'object') throw new Error('Invalid activity summary');
  const summary = data as Record<string, unknown>;
  const { totalVisits, aiVisits, examinedEvents, partial } = summary;
  if (
    typeof totalVisits !== 'number' || !Number.isSafeInteger(totalVisits) || totalVisits < 0 ||
    typeof aiVisits !== 'number' || !Number.isSafeInteger(aiVisits) || aiVisits < 0 || aiVisits > totalVisits ||
    typeof examinedEvents !== 'number' || !Number.isSafeInteger(examinedEvents) || examinedEvents < totalVisits ||
    typeof partial !== 'boolean'
  ) throw new Error('Invalid activity summary');

  return {
    status: totalVisits > 0 ? 'verified' : partial ? 'inconclusive' : 'not_detected',
    totalVisits,
    aiVisits,
    examinedEvents,
    partial,
  };
}
