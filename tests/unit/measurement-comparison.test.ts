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
        contract_version: 'measurement.v1',
        provider_model: 'gemini-2.5-flash',
        measurement_region: 'global-unspecified',
        measurement_mode: 'standard',
        scorer_version: 'aelo-brand-scorer.v1',
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
