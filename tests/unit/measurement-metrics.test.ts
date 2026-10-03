import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateMentionMetric,
  compareCompatibleMentionMetrics,
  healthScoreMetric,
  mentionVolatilityPercent,
  shareOfVoiceMetric,
  type ComparableMentionSample,
} from '../../lib/measurement/metrics';

test('visibility is the successful-sample mention rate', () => {
  const metric = aggregateMentionMetric([
    { mentioned: true },
    { mentioned: true },
    { mentioned: true },
    { mentioned: false },
  ]);

  assert.equal(metric.status, 'measured');
  assert.equal(metric.samples, 4);
  assert.equal(metric.mentions, 3);
  assert.equal(metric.mentionRate, 0.75);
  assert.equal(metric.visibilityPercent, 75);
});

test('no successful samples are unmeasured rather than zero visibility', () => {
  const metric = aggregateMentionMetric([]);

  assert.equal(metric.status, 'unmeasured');
  assert.equal(metric.samples, 0);
  assert.equal(metric.mentionRate, null);
  assert.equal(metric.visibilityPercent, null);
});

test('a measured non-mention is a real zero', () => {
  const metric = aggregateMentionMetric([{ mentioned: false }]);

  assert.equal(metric.status, 'measured');
  assert.equal(metric.visibilityPercent, 0);
});

function comparable(overrides: Partial<ComparableMentionSample> = {}): ComparableMentionSample {
  return {
    prompt: 'best answer engine tools',
    platform: 'gemini',
    mentioned: true,
    providerModel: 'gemini-2.5-flash',
    region: 'global-unspecified',
    mode: 'standard',
    scorerVersion: 'aelo-brand-scorer.v2',
    contractVersion: 'measurement.v2',
    searchMode: 'google_search_auto',
    analyzerMethod: 'deterministic-mentions+gemini-sentiment',
    analyzerModel: 'gemini-2.5-flash',
    analyzerPromptVersion: 'aelo-sentiment.v2',
    ...overrides,
  };
}

test('period change only compares fully compatible cohorts', () => {
  const current = Array.from({ length: 4 }, (_, index) => comparable({ mentioned: index < 3 }));
  const previous = Array.from({ length: 4 }, (_, index) => comparable({ mentioned: index < 2 }));

  const comparison = compareCompatibleMentionMetrics(current, previous);

  assert.equal(comparison.status, 'comparable');
  assert.equal(comparison.current.visibilityPercent, 75);
  assert.equal(comparison.previous.visibilityPercent, 50);
  assert.equal(comparison.changePoints, 25);
});

test('period change is unavailable when model metadata differs or a cohort is too small', () => {
  const current = Array.from({ length: 4 }, () => comparable());
  const differentModel = Array.from({ length: 4 }, () => comparable({ providerModel: 'gemini-3' }));
  const tooSmall = Array.from({ length: 3 }, () => comparable());

  assert.equal(compareCompatibleMentionMetrics(current, differentModel).status, 'incompatible');
  assert.equal(compareCompatibleMentionMetrics(current, differentModel).changePoints, null);
  assert.equal(compareCompatibleMentionMetrics(current, tooSmall).status, 'insufficient_samples');
  assert.equal(compareCompatibleMentionMetrics(current, tooSmall).changePoints, null);
});

test('missing compatibility metadata cannot produce a change claim', () => {
  const current = Array.from({ length: 4 }, () => comparable({ providerModel: null }));
  const previous = Array.from({ length: 4 }, () => comparable({ providerModel: null }));

  assert.equal(compareCompatibleMentionMetrics(current, previous).status, 'incompatible');
});

test('legacy rows do not poison a valid matched cohort', () => {
  const current = [
    ...Array.from({ length: 4 }, () => comparable()),
    comparable({ providerModel: null, mentioned: false }),
  ];
  const previous = Array.from({ length: 4 }, (_, index) => comparable({ mentioned: index < 2 }));

  const comparison = compareCompatibleMentionMetrics(current, previous);

  assert.equal(comparison.status, 'comparable');
  assert.equal(comparison.current.samples, 4);
  assert.equal(comparison.changePoints, 50);
});

test('search and analyzer changes cannot produce a comparable improvement claim', () => {
  const baseline = Array.from({ length: 4 }, () => comparable());
  for (const changed of [{ searchMode: 'none' }, { analyzerModel: 'different-model' },
    { analyzerMethod: 'keyword-fallback' }, { analyzerPromptVersion: null }]) {
    assert.equal(compareCompatibleMentionMetrics(baseline,
      Array.from({ length: 4 }, () => comparable(changed))).status, 'incompatible');
  }
});

test('changing the mix of easy and hard prompts is not an improvement', () => {
  const easy = (count: number) => Array.from({ length: count }, () => comparable({ prompt: 'easy', mentioned: true }));
  const hard = (count: number) => Array.from({ length: count }, () => comparable({ prompt: 'hard', mentioned: false }));
  const result = compareCompatibleMentionMetrics([...easy(16), ...hard(4)], [...easy(4), ...hard(16)]);
  assert.equal(result.status, 'incompatible');
  assert.equal(result.changePoints, null);
});

test('share of voice counts each brand at most once per answer and is null without mentions', () => {
  const measured = shareOfVoiceMetric([
    { brandMentioned: true, competitorsMentioned: ['Peer', 'peer', 'Other'] },
    { brandMentioned: false, competitorsMentioned: ['Other'] },
  ]);
  const absent = shareOfVoiceMetric([{ brandMentioned: false, competitorsMentioned: [] }]);

  assert.equal(measured.brandMentions, 1);
  assert.equal(measured.competitorMentions, 3);
  assert.equal(measured.sharePercent, 25);
  assert.equal(absent.sharePercent, null);
});

test('mention volatility is symmetric and describes only the mention split', () => {
  assert.equal(mentionVolatilityPercent(0, 0), null);
  assert.equal(mentionVolatilityPercent(0, 4), 0);
  assert.equal(mentionVolatilityPercent(4, 4), 0);
  assert.equal(mentionVolatilityPercent(1, 4), 50);
  assert.equal(mentionVolatilityPercent(3, 4), 50);
  assert.equal(mentionVolatilityPercent(2, 4), 100);
  assert.throws(() => mentionVolatilityPercent(5, 4), RangeError);
});

test('health score follows the published mention-rate and position formula', () => {
  assert.equal(healthScoreMetric(null, null), null);
  assert.equal(healthScoreMetric(0, null), 0);
  assert.equal(healthScoreMetric(100, 1), 100);
  assert.equal(healthScoreMetric(50, 10), 35);
  assert.equal(healthScoreMetric(50, null), null);
});
