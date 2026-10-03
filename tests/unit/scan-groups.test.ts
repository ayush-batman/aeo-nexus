import assert from 'node:assert/strict';
import test from 'node:test';
import type { LLMScan } from '../../lib/types';
import { groupRecentScans } from '../../lib/measurement/scan-groups';

function row(overrides: Partial<LLMScan>): LLMScan {
  return {
    id: crypto.randomUUID(), workspace_id: 'workspace', platform: 'gemini', prompt: 'Best tools?', response: 'Answer',
    brand_mentioned: false, mention_position: null, sentiment: 'neutral', competitors_mentioned: [], citations: [],
    sample_id: crypto.randomUUID(), measurement_run_id: 'run-1', sample_index: 1, provider_model: 'gemini-test',
    measurement_region: 'global-unspecified', measurement_mode: 'standard', scorer_version: 'scorer-v2',
    measurement_contract_version: 'measurement-v2', created_at: '2026-09-12T12:00:00.000Z',
    ...overrides,
  };
}

test('recent scan groups report observed mention rate instead of position-based scores', () => {
  const group = groupRecentScans([
    row({ sample_number: 1, brand_mentioned: true, mention_position: 1 }),
    row({ sample_number: 2, brand_mentioned: false }),
    row({ sample_number: 3, brand_mentioned: false }),
    row({ sample_number: 4, brand_mentioned: false }),
  ])[0];
  assert.equal(group.sampleCount, 4);
  assert.equal(group.mentionCount, 1);
  assert.equal(group.mentionRate, 0.25);
  assert.equal(group.visibilityPercent, 25);
  assert.equal(group.confidence.level, 'low');
  assert.equal(group.averageMentionPosition, 1);
});

test('unrelated legacy rows are never combined into a made-up cohort', () => {
  const groups = groupRecentScans([
    row({ id: 'legacy-1', measurement_run_id: null }),
    row({ id: 'legacy-2', measurement_run_id: null, brand_mentioned: true }),
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map((group) => group.sampleCount), [1, 1]);
});

test('groups expose failures and deduplicate citations without weakening provenance', () => {
  const shared = { url: 'https://example.com/source', title: 'Source', is_own_domain: false };
  const group = groupRecentScans([
    row({ id: 'one', citations: [{ ...shared, provenance: 'link_mentioned' }] }),
    row({ id: 'two', citations: [{ ...shared, provenance: 'provider_citation' }] }),
    row({ id: 'three', failure_code: 'provider_timeout' }),
  ])[0];
  assert.equal(group.sampleCount, 2);
  assert.equal(group.failedSamples, 1);
  assert.equal(group.citations.length, 1);
  assert.equal(group.citations[0].provenance, 'provider_citation');
});

test('an empty saved answer is not counted as a measured non-mention or mention', () => {
  const group = groupRecentScans([
    row({ id: 'usable', response: 'A real answer', brand_mentioned: true }),
    row({ id: 'empty', response: '   ', brand_mentioned: false }),
    row({ id: 'empty-flagged', response: '', brand_mentioned: true }),
  ])[0];

  assert.equal(group.sampleCount, 1);
  assert.equal(group.failedSamples, 2);
  assert.equal(group.mentionCount, 1);
  assert.equal(group.visibilityPercent, 100);
  assert.equal(group.confidence.sampleCount, 1);
});
