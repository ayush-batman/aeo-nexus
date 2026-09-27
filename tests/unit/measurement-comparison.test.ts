import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVisibilitySnapshots, type ComparableSnapshot } from '../../lib/measurement/comparison';

function snapshot(prompt: string, engine: string, mentions: number, samples: number): ComparableSnapshot {
  return {
    [prompt]: {
      [engine]: {
        mentioned: mentions / samples >= 0.5,
        position: mentions > 0 ? 2 : null,
        sentiment: null,
        sample_count: samples,
        mention_count: mentions,
        mention_rate: mentions / samples,
        position_sample_count: mentions,
        contract_version: 'measurement.v2',
        provider_model: 'gemini-2.5-flash',
        measurement_region: 'global-unspecified',
        measurement_mode: 'standard',
        scorer_version: 'aelo-brand-scorer.v2',
        search_mode: 'google_search_auto',
        analyzer_method: 'deterministic-mentions+gemini-sentiment',
        analyzer_model: 'gemini-2.5-flash',
        analyzer_prompt_version: 'aelo-sentiment.v2',
      },
    },
  };
}

test('declares improvement only for non-overlapping matched cohorts', () => {
  const result = compareVisibilitySnapshots(snapshot('best tools', 'gemini', 0, 8), snapshot('best tools', 'gemini', 8, 8));
  assert.equal(result.verdict, 'improved');
  assert.equal(result.visibility_change, 100);
  assert.equal(result.comparable_pairs, 1);
});

test('declares regression only for non-overlapping matched cohorts', () => {
  const result = compareVisibilitySnapshots(snapshot('best tools', 'gemini', 8, 8), snapshot('best tools', 'gemini', 0, 8));
  assert.equal(result.verdict, 'regressed');
  assert.equal(result.visibility_change, -100);
});

test('small or legacy single-point cohorts are inconclusive', () => {
  assert.equal(compareVisibilitySnapshots(snapshot('p', 'gemini', 3, 3), snapshot('p', 'gemini', 0, 3)).verdict, 'inconclusive');
  const legacy = { p: { gemini: { mentioned: true, position: 1, sentiment: null } } };
  assert.equal(compareVisibilitySnapshots(legacy, legacy).verdict, 'inconclusive');
  assert.equal(compareVisibilitySnapshots(legacy, legacy).visibility_change, null);
});

test('mismatched prompts and engines are excluded', () => {
  const result = compareVisibilitySnapshots(snapshot('prompt a', 'gemini', 0, 8), snapshot('prompt b', 'claude', 8, 8));
  assert.equal(result.verdict, 'inconclusive');
  assert.equal(result.comparable_pairs, 0);
  assert.equal(result.baseline_sample_count, 0);
});

test('mismatched model or scorer cohorts are explicitly inconclusive', () => {
  const baseline = snapshot('p', 'gemini', 0, 8);
  const followup = snapshot('p', 'gemini', 8, 8);
  followup.p.gemini.provider_model = 'gemini-2.0-flash';
  assert.equal(compareVisibilitySnapshots(baseline, followup).verdict, 'inconclusive');
  assert.equal(compareVisibilitySnapshots(baseline, followup).comparable_pairs, 0);
});

test('overlapping confidence intervals remain inconclusive', () => {
  const result = compareVisibilitySnapshots(snapshot('p', 'gemini', 3, 8), snapshot('p', 'gemini', 5, 8));
  assert.equal(result.verdict, 'inconclusive');
  assert.equal(result.visibility_change, 25);
});

test('rank change is not reported when position evidence comes from different cohorts', () => {
  const baseline = {
    ...snapshot('prompt a', 'gemini', 8, 8),
    ...snapshot('prompt b', 'gemini', 0, 8),
  };
  const followup = {
    ...snapshot('prompt a', 'gemini', 0, 8),
    ...snapshot('prompt b', 'gemini', 8, 8),
  };
  baseline['prompt a'].gemini.position = 1;
  followup['prompt b'].gemini.position = 5;

  const result = compareVisibilitySnapshots(baseline, followup);
  assert.equal(result.comparable_pairs, 2);
  assert.equal(result.visibility_change, 0);
  assert.equal(result.position_change, null);
});

test('rank change is not reported when position sample mix shifts between cohorts', () => {
  const baseline = {
    ...snapshot('prompt a', 'gemini', 7, 8),
    ...snapshot('prompt b', 'gemini', 1, 8),
  };
  const followup = {
    ...snapshot('prompt a', 'gemini', 1, 8),
    ...snapshot('prompt b', 'gemini', 7, 8),
  };
  baseline['prompt a'].gemini.position = 1;
  followup['prompt a'].gemini.position = 1;
  baseline['prompt b'].gemini.position = 5;
  followup['prompt b'].gemini.position = 5;

  const result = compareVisibilitySnapshots(baseline, followup);
  assert.equal(result.visibility_change, 0);
  assert.equal(result.position_change, null);
});

test('rank change remains available for matching position cohorts', () => {
  const baseline = snapshot('prompt a', 'gemini', 4, 8);
  const followup = snapshot('prompt a', 'gemini', 4, 8);
  baseline['prompt a'].gemini.position = 2;
  followup['prompt a'].gemini.position = 3;

  assert.equal(compareVisibilitySnapshots(baseline, followup).position_change, 1);
});

test('an action cannot claim improvement from only one of its requested cohorts', () => {
  const baseline = {
    ...snapshot('prompt a', 'gemini', 0, 8),
    ...snapshot('prompt b', 'gemini', 0, 8),
  };
  const followup = {
    ...snapshot('prompt a', 'gemini', 8, 8),
    ...snapshot('prompt b', 'gemini', 3, 3),
  };
  const expected = [
    { prompt: 'prompt a', engine: 'gemini' },
    { prompt: 'prompt b', engine: 'gemini' },
  ];

  const partial = compareVisibilitySnapshots(baseline, followup, undefined, expected);
  assert.equal(partial.comparable_pairs, 1);
  assert.equal(partial.verdict, 'inconclusive');
  assert.equal(partial.visibility_change, null);
  assert.equal(partial.position_change, null);
  assert.match(partial.reason, /requested prompt\/engine pair lacks compatible/);

  const missing = compareVisibilitySnapshots(baseline, snapshot('prompt a', 'gemini', 8, 8), undefined, expected);
  assert.equal(missing.verdict, 'inconclusive');
  assert.equal(missing.visibility_change, null);

  followup['prompt b'] = snapshot('prompt b', 'gemini', 8, 8)['prompt b'];
  const complete = compareVisibilitySnapshots(baseline, followup, undefined, expected);
  assert.equal(complete.comparable_pairs, 2);
  assert.equal(complete.verdict, 'improved');
  assert.equal(complete.visibility_change, 100);
});
