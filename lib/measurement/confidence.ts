import type { MeasurementConfidence } from './types';

const Z_95 = 1.959963984540054;

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** A 95% Wilson interval for a Bernoulli mention rate. */
export function estimateMentionConfidence(mentions: number, sampleCount: number): MeasurementConfidence {
  if (!Number.isSafeInteger(sampleCount) || sampleCount < 0 || !Number.isSafeInteger(mentions) || mentions < 0 || mentions > sampleCount) {
    throw new RangeError('Mention confidence requires integer counts with 0 <= mentions <= sampleCount.');
  }
  if (sampleCount === 0) {
    return { level: 'none', sampleCount: 0, mentions: 0, mentionRate: null, interval: null };
  }

  const rate = mentions / sampleCount;
  const z2 = Z_95 ** 2;
  const denominator = 1 + z2 / sampleCount;
  const center = (rate + z2 / (2 * sampleCount)) / denominator;
  const margin = (Z_95 / denominator) * Math.sqrt((rate * (1 - rate) / sampleCount) + (z2 / (4 * sampleCount ** 2)));
  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);
  const width = upper - lower;
  const level = sampleCount < 4
    ? 'low'
    : sampleCount >= 8 && width <= 0.5
      ? 'high'
      : 'medium';

  return {
    level,
    sampleCount,
    mentions,
    mentionRate: rounded(rate),
    interval: { lower: rounded(lower), upper: rounded(upper), confidence: 0.95, method: 'wilson' },
  };
}
