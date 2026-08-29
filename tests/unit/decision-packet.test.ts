import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDecisionPacket } from '../../lib/measurement/decision-packet';
import type { VisibilityMeasurementRun } from '../../lib/measurement/types';

function run(overrides: Partial<VisibilityMeasurementRun> = {}): VisibilityMeasurementRun {
  return {
    contractVersion: 'measurement.v1',
    runId: 'run-1',
    prompt: 'best answer engine tracker',
    brandName: 'Aelo',
    requestedEngines: ['gemini'],
    requestedSamplesPerEngine: 4,
    status: 'complete',
    visibilityScore: 50,
    engines: [{
      engine: 'gemini', requestedSamples: 4, successfulSamples: 4, failedSamples: 0,
      mentions: 1, mentionRate: 0.25, mentioned: false, avgPosition: 3, sentiment: 'neutral',
      confidence: { level: 'medium', sampleCount: 4, mentions: 1, mentionRate: 0.25, interval: { lower: 0.0456, upper: 0.6994, confidence: 0.95, method: 'wilson' } },
      citations: [{ url: 'https://example.com/list', title: 'List', is_own_domain: false, provenance: 'provider_citation', provider: 'gemini', sample_id: 's1', raw_provider_reference: {}, fetch_validation: 'not_checked' }],
      evidence: [],
    }],
    samples: [], failures: [], persistence: { status: 'stored', rows: 4, error: null },
    startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:01:00.000Z',
    ...overrides,
  };
}

test('packet ranks a provider-backed external source for the weakest prompt', () => {
  const packet = buildDecisionPacket({ id: 'p1', workspaceId: 'w1', brandName: 'Aelo', measurements: [run()] });
  assert.equal(packet.status, 'complete');
  assert.equal(packet.sourceGaps[0]?.domain, 'example.com');
  assert.equal(packet.rankedAction.type, 'earn_source_mention');
  assert.equal(packet.rankedAction.prompt, 'best answer engine tracker');
});

test('packet is partial or untracked without hiding provider and persistence failures', () => {
  assert.equal(buildDecisionPacket({ id: 'p', workspaceId: 'w', brandName: 'A', measurements: [run({ status: 'partial' })] }).status, 'partial');
  assert.equal(buildDecisionPacket({ id: 'p', workspaceId: 'w', brandName: 'A', measurements: [run({ persistence: { status: 'failed', rows: 0, error: 'db' } })] }).status, 'untracked');
});

test('all-failed packet recommends repair rather than inventing an action gap', () => {
  const packet = buildDecisionPacket({ id: 'p', workspaceId: 'w', brandName: 'A', measurements: [run({ status: 'all_failed', engines: [], visibilityScore: null })] });
  assert.equal(packet.status, 'all_failed');
  assert.equal(packet.rankedAction.type, 'repair_tracking');
  assert.equal(packet.sourceGaps.length, 0);
});
