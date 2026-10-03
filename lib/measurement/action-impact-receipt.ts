export type ActionImpactReceipt = {
  visibility_change: number | null;
  position_change: number | null;
  verdict: 'improved' | 'regressed' | 'inconclusive';
  measured_at: string;
  reason: string;
  baseline_sample_count: number;
  followup_sample_count: number;
};

function finiteOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function sampleCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/** Old imports may contain `{}` instead of a measured result. Never render them as verdicts. */
export function parseActionImpactReceipt(value: unknown): ActionImpactReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const verdict = data.verdict;
  const visibilityChange = data.visibility_change;
  const positionChange = data.position_change;
  const measuredAt = data.measured_at;
  const before = data.baseline_sample_count;
  const after = data.followup_sample_count;
  if (verdict !== 'improved' && verdict !== 'regressed' && verdict !== 'inconclusive') return null;
  if (!finiteOrNull(visibilityChange) || !finiteOrNull(positionChange)) return null;
  if (visibilityChange !== null && (visibilityChange < -100 || visibilityChange > 100)) return null;
  if (typeof measuredAt !== 'string' || !Number.isFinite(Date.parse(measuredAt)) || new Date(measuredAt).toISOString() !== measuredAt) return null;
  if (!sampleCount(before) || !sampleCount(after)) return null;
  if (typeof data.reason !== 'string' || !data.reason.trim()) return null;
  if (verdict !== 'inconclusive' && (visibilityChange === null || before < 4 || after < 4)) return null;
  return {
    verdict,
    visibility_change: visibilityChange,
    position_change: positionChange,
    measured_at: measuredAt,
    reason: data.reason,
    baseline_sample_count: before,
    followup_sample_count: after,
  };
}
