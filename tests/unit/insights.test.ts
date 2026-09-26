import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInsights } from '../../lib/measurement/insights';
import type { LLMScan } from '../../lib/types';

function row(overrides: Partial<LLMScan> = {}): LLMScan {
  return {
    id: crypto.randomUUID(), workspace_id: 'workspace', platform: 'gemini', prompt: 'Best AEO tools?', response: 'Profound is listed.',
    brand_mentioned: false, mention_position: null, sentiment: 'neutral', competitors_mentioned: ['Profound'],
    citations: [{ url: 'https://example.com/source', title: 'Source', is_own_domain: false, provenance: 'provider_citation' }],
    sample_id: crypto.randomUUID(), measurement_run_id: 'run-latest', sample_index: 1, sample_number: 1,
    provider_model: 'gemini-test', measurement_region: 'global-unspecified', measurement_mode: 'standard',
    scorer_version: 'aelo-brand-scorer.v2', measurement_contract_version: 'measurement.v2',
    search_mode: 'google_search', analyzer_method: 'deterministic-mentions+keyword-sentiment', analyzer_model: 'none',
    analyzer_prompt_version: 'aelo-sentiment.v3', created_at: '2026-09-12T12:00:00.000Z',
    ...overrides,
  };
}

test('one successful sample asks for evidence instead of claiming invisibility', () => {
  const insights = buildInsights([row()]);
  assert.equal(insights.length, 1);
  assert.match(insights[0].title, /More evidence needed/);
  assert.doesNotMatch(insights[0].detail, /doesn't know|invisible/i);
});

test('latest four-sample run reports the exact denominator and confidence range', () => {
  const insights = buildInsights(Array.from({ length: 4 }, (_, index) => row({ sample_number: index + 1 })));
  assert.equal(insights[0].title, 'Profound appeared where you were absent');
  assert.match(insights[0].detail, /0 of 4 successful samples/);
  assert.match(insights[0].detail, /low confidence; 95% repeatability range 0–49%/);
  assert.equal(insights[0].actionHref, '/dashboard/sources');
});

test('partial and legacy runs cannot generate a clean visibility action', () => {
  const partial = [
    ...Array.from({ length: 3 }, (_, index) => row({ sample_number: index + 1 })),
    row({ sample_number: 4, response: '', failure_code: 'provider_timeout' }),
  ];
  const partialInsights = buildInsights(partial);
  assert.match(partialInsights[0].title, /Partial evidence/);
  assert.match(partialInsights[0].detail, /3 samples succeeded and 1 failed/);
  assert.deepEqual(buildInsights([row({ measurement_run_id: null })]), []);
});

test('an empty saved answer without a failure code still blocks ranked advice', () => {
  const rows = [
    ...Array.from({ length: 3 }, (_, index) => row({ sample_number: index + 1 })),
    row({ sample_number: 4, response: '   ', brand_mentioned: false }),
  ];
  const insights = buildInsights(rows);
  assert.match(insights[0].title, /Partial evidence/);
  assert.match(insights[0].detail, /failed or had no usable answer/);
  assert.doesNotMatch(insights[0].title, /appeared where you were absent/);
});
