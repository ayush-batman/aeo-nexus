import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyActivitySummary } from '../../lib/analytics/install-verification';

test('activity verification distinguishes complete absence from a partial search', () => {
  const empty = { totalVisits: 0, aiVisits: 0, examinedEvents: 0, partial: false };
  assert.equal(classifyActivitySummary(empty).status, 'not_detected');
  assert.equal(classifyActivitySummary({ ...empty, examinedEvents: 5000, partial: true }).status, 'inconclusive');
  assert.equal(classifyActivitySummary({ ...empty, totalVisits: 1, aiVisits: 1, examinedEvents: 5000, partial: true }).status, 'verified');
});

test('activity verification rejects malformed summaries rather than implying no tracking', () => {
  for (const value of [null, {}, { totalVisits: 0, aiVisits: 0, partial: false },
    { totalVisits: -1, aiVisits: 0, examinedEvents: 0, partial: false },
    { totalVisits: 0, aiVisits: 1, examinedEvents: 1, partial: false },
    { totalVisits: 1, aiVisits: 0, examinedEvents: 0, partial: false }]) {
    assert.throws(() => classifyActivitySummary(value), /Invalid activity summary/);
  }
});
