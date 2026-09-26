import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDecisionPacket } from '../../lib/measurement/decision-packet';
import type { VisibilityMeasurementRun } from '../../lib/measurement/types';

function run(overrides: Partial<VisibilityMeasurementRun> = {}): VisibilityMeasurementRun {
  return {
    contractVersion: 'measurement.v1',
    runId: 'run-1',
    scorerVersion: 'aelo-brand-scorer.v1',
    region: 'global-unspecified',
    mode: 'standard',
    prompt: 'best answer engine tracker',
    brandName: 'Aelo',
    requestedEngines: ['gemini'],
    requestedSamplesPerEngine: 4,
    status: 'complete',
    visibilityScore: 50,
    engines: [{
      engine: 'gemini', providerModels: ['gemini-2.5-flash'], requestedSamples: 4, successfulSamples: 4, failedSamples: 0,
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

test('packet does not claim a cited page lacks the brand without checking that page', () => {
  const packet = buildDecisionPacket({ id: 'p1', workspaceId: 'w1', brandName: 'Aelo', measurements: [run()] });
  assert.equal(packet.status, 'complete');
  assert.equal(packet.sourceGaps[0]?.domain, 'example.com');
  assert.equal(packet.rankedAction.type, 'review_cited_source');
  assert.match(packet.rankedAction.title, /Review/);
  assert.match(packet.rankedAction.rationale, /has not checked whether this page already mentions Aelo/);
  assert.equal(packet.rankedAction.prompt, 'best answer engine tracker');
});

test('packet does not recommend visibility work when every successful answer names the brand', () => {
  const complete = run({ engines: [{ ...run().engines[0], mentions: 4, mentionRate: 1 }] });
  const packet = buildDecisionPacket({ id: 'p2', workspaceId: 'w1', brandName: 'Aelo', measurements: [complete] });
  assert.equal(packet.rankedAction.type, 'review_measurement');
  assert.doesNotMatch(packet.rankedAction.title, /earn|publish/i);
});

test('packet does not rank content work from fewer than four successful samples', () => {
  const sparse = run({ engines: [{ ...run().engines[0], successfulSamples: 2, requestedSamples: 2, mentions: 1, mentionRate: 0.5 }] });
  const packet = buildDecisionPacket({ id: 'p4', workspaceId: 'w1', brandName: 'Aelo', measurements: [sparse] });
  assert.equal(packet.rankedAction.type, 'review_measurement');
});

test('packet does not use a source from a different prompt to explain the weakest prompt', () => {
  const strong = run({ prompt: 'branded comparison', engines: [{ ...run().engines[0], mentions: 4, mentionRate: 1 }] });
  const weak = run({ runId: 'run-2', prompt: 'budget tools', engines: [{ ...run().engines[0], citations: [] }] });
  const packet = buildDecisionPacket({ id: 'p3', workspaceId: 'w1', brandName: 'Aelo', measurements: [strong, weak] });
  assert.equal(packet.rankedAction.prompt, 'budget tools');
  assert.equal(packet.rankedAction.sourceDomain, null);
});

test('packet is partial or untracked without hiding provider and persistence failures', () => {
  const partial = buildDecisionPacket({ id: 'p', workspaceId: 'w', brandName: 'A', measurements: [run({ status: 'partial' })] });
  const untracked = buildDecisionPacket({ id: 'p', workspaceId: 'w', brandName: 'A', measurements: [run({ persistence: { status: 'failed', rows: 0, error: 'db' } })] });
  assert.equal(partial.status, 'partial');
  assert.equal(untracked.status, 'untracked');
  assert.equal(partial.rankedAction.type, 'repair_tracking');
  assert.equal(untracked.rankedAction.type, 'repair_tracking');
});

test('all-failed packet recommends repair rather than inventing an action gap', () => {
  const packet = buildDecisionPacket({ id: 'p', workspaceId: 'w', brandName: 'A', measurements: [run({ status: 'all_failed', engines: [], visibilityScore: null })] });
  assert.equal(packet.status, 'all_failed');
  assert.equal(packet.rankedAction.type, 'repair_tracking');
  assert.equal(packet.sourceGaps.length, 0);
});
