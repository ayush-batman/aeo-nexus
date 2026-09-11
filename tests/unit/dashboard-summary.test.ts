import assert from 'node:assert/strict';
import test from 'node:test';

import {
  summarizeDashboardObservations,
  type DashboardObservation,
} from '../../lib/measurement/dashboard-summary';

const NOW = Date.UTC(2026, 8, 11, 12);

function observation(overrides: Partial<DashboardObservation> = {}): DashboardObservation {
  return {
    prompt: 'best answer engine tools',
    platform: 'gemini',
    hasEvidence: true,
    brandMentioned: true,
    mentionPosition: 2,
    competitorsMentioned: [],
    providerModel: 'gemini-2.5-flash',
    region: 'global-unspecified',
    mode: 'standard',
    scorerVersion: 'aelo-brand-scorer.v2',
    contractVersion: 'measurement.v2',
    searchMode: 'google_search_auto',
    analyzerMethod: 'deterministic-mentions+gemini-sentiment',
    analyzerModel: 'gemini-2.5-flash',
    analyzerPromptVersion: 'aelo-sentiment.v2',
    createdAt: NOW - 86400_000,
    ...overrides,
  };
}

test('dashboard visibility excludes failures and compares only compatible cohorts', () => {
  const current = Array.from({ length: 4 }, (_, index) => observation({ brandMentioned: index < 2 }));
  const previous = Array.from({ length: 4 }, (_, index) => observation({
    brandMentioned: index === 0,
    createdAt: NOW - 8 * 86400_000,
  }));
  const failed = observation({ hasEvidence: false, brandMentioned: true });

  const summary = summarizeDashboardObservations({ observations: [...current, ...previous, failed], now: NOW, truncated: false });

  assert.equal(summary.stats.llmVisibility, 50);
  assert.equal(summary.stats.llmVisibilitySamples, 4);
  assert.equal(summary.stats.llmVisibilityMentions, 2);
  assert.equal(summary.stats.llmVisibilityChange, 25);
  assert.equal(summary.visibilityMetrics.find((metric) => metric.platform === 'Gemini')?.change, 25);
});

test('incompatible metadata and truncated reads cannot produce a score or change claim', () => {
  const current = Array.from({ length: 4 }, () => observation());
  const previous = Array.from({ length: 4 }, () => observation({
    providerModel: 'gemini-3',
    createdAt: NOW - 8 * 86400_000,
  }));

  const incompatible = summarizeDashboardObservations({ observations: [...current, ...previous], now: NOW, truncated: false });
  assert.equal(incompatible.stats.llmVisibility, 100);
  assert.equal(incompatible.stats.llmVisibilityChange, null);

  const truncated = summarizeDashboardObservations({ observations: current, now: NOW, truncated: true });
  assert.equal(truncated.status, 'partial');
  assert.equal(truncated.stats.llmVisibility, null);
  assert.equal(truncated.stats.llmVisibilityChange, null);
  assert.equal(truncated.visibilityMetrics.find((metric) => metric.platform === 'Gemini')?.score, null);
});

test('share of voice is withheld when compact competitor evidence is incomplete', () => {
  const complete = summarizeDashboardObservations({
    observations: [
      observation({ competitorsMentioned: ['Peer', 'peer', 'Other'] }),
      observation({ brandMentioned: false, competitorsMentioned: ['Other'] }),
    ],
    now: NOW,
    truncated: false,
  });
  assert.equal(complete.stats.shareOfVoice, 25);

  const legacy = summarizeDashboardObservations({
    observations: [observation({ competitorsMentioned: undefined })],
    now: NOW,
    truncated: false,
  });
  assert.equal(legacy.status, 'partial');
  assert.equal(legacy.stats.shareOfVoice, null);
});

test('partial or pending measurement runs prevent an improvement claim', () => {
  const current = Array.from({ length: 4 }, () => observation());
  const previous = Array.from({ length: 4 }, () => observation({
    brandMentioned: false,
    createdAt: NOW - 8 * 86400_000,
  }));
  const summary = summarizeDashboardObservations({
    observations: [...current, ...previous],
    now: NOW,
    truncated: false,
    partialEvidence: true,
  });
  assert.equal(summary.status, 'partial');
  assert.equal(summary.stats.llmVisibility, 100);
  assert.equal(summary.stats.llmVisibilityChange, null);
  assert.equal(summary.visibilityMetrics.find((metric) => metric.platform === 'Gemini')?.change, null);
  assert.ok(summary.partialReasons.includes('measurement_failures_or_pending_runs'));
});
