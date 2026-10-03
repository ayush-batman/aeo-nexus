import assert from 'node:assert/strict';
import test from 'node:test';
import { newOwnCitationUrls, selectPreviousAlertCohort, type ScanData } from '../../lib/alerts/evaluate';

function scan(overrides: Partial<ScanData> = {}): ScanData {
  return {
    prompt: 'best crm for indian startups',
    brand_mentioned: false,
    mention_position: null,
    sentiment: 'neutral',
    competitors_mentioned: [],
    citations: [],
    platform: 'gemini',
    provider_model: 'gemini-2.5-flash',
    measurement_region: 'in',
    measurement_mode: 'standard',
    scorer_version: 'v2',
    measurement_contract_version: 'v2',
    search_mode: 'grounded-search',
    analyzer_method: 'gemini',
    analyzer_model: 'synthetic-analyzer',
    analyzer_prompt_version: 'test-v2',
    measurement_run_id: '00000000-0000-0000-0000-000000000001',
    created_at: '2026-08-29T10:00:00.000Z',
    ...overrides,
  };
}

test('alert comparison keeps only the latest earlier run for an exact cohort', () => {
  const current = Array.from({ length: 4 }, () => scan({
    measurement_run_id: '00000000-0000-0000-0000-000000000003',
  }));
  const latestPrevious = Array.from({ length: 4 }, () => scan({
    brand_mentioned: true,
    measurement_run_id: '00000000-0000-0000-0000-000000000002',
    created_at: '2026-08-28T10:00:00.000Z',
  }));
  const olderPrevious = Array.from({ length: 4 }, () => scan({
    brand_mentioned: false,
    measurement_run_id: '00000000-0000-0000-0000-000000000001',
    created_at: '2026-08-20T10:00:00.000Z',
  }));

  const selected = selectPreviousAlertCohort(current, [...latestPrevious, ...olderPrevious]);

  assert.equal(selected.length, 4);
  assert.ok(selected.every((row) => row.measurement_run_id === '00000000-0000-0000-0000-000000000002'));
});

test('alert comparison rejects rows from a different provider model', () => {
  const current = Array.from({ length: 4 }, () => scan());
  const previous = Array.from({ length: 4 }, () => scan({
    provider_model: 'gemini-older-model',
    measurement_run_id: '00000000-0000-0000-0000-000000000002',
  }));

  assert.deepEqual(selectPreviousAlertCohort(current, previous), []);
});

test('alert comparison sorts history and excludes future, same-run and changed-case prompts', () => {
  const current = [scan({ measurement_run_id: 'current' })];
  const older = scan({ measurement_run_id: 'old', created_at: '2026-08-20T10:00:00Z' });
  const recent = scan({ measurement_run_id: 'recent', created_at: '2026-08-28T10:00:00Z' });
  assert.deepEqual(selectPreviousAlertCohort(current, [older, scan({ measurement_run_id: 'future', created_at: '2026-09-01T10:00:00Z' }), recent]), [recent]);
  assert.deepEqual(selectPreviousAlertCohort(current, [{ ...recent, prompt: recent.prompt.toUpperCase() }, { ...recent, measurement_run_id: 'current' }]), []);
});

test('citation alerts include only newly observed provider-backed own-domain URLs', () => {
  const existing = 'https://aelo.example/existing';
  const newlyEarned = 'https://aelo.example/new';
  const citation = (url: string, provenance: 'provider_citation' | 'link_mentioned' = 'provider_citation') => ({
    url,
    is_own_domain: true,
    provenance,
  });
  const previous = [scan({ citations: [citation(existing)] })];
  const current = [scan({ citations: [citation(existing), citation(newlyEarned), citation('https://aelo.example/prose', 'link_mentioned')] })];

  assert.deepEqual(newOwnCitationUrls(current, previous), [newlyEarned]);
});
