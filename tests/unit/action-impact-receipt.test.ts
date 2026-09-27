import assert from 'node:assert/strict';
import test from 'node:test';
import { parseActionImpactReceipt } from '../../lib/measurement/action-impact-receipt';

const measured = {
  verdict: 'improved', visibility_change: 100, position_change: null,
  measured_at: '2026-09-27T09:00:00.000Z', reason: 'Matched evidence improved.',
  baseline_sample_count: 8, followup_sample_count: 8,
};

test('import placeholders and malformed or unproven verdicts are not rendered as measurements', () => {
  for (const value of [null, {}, [], { ...measured, verdict: undefined }, { ...measured, verdict: 'no_change' },
    { ...measured, measured_at: undefined }, { ...measured, measured_at: 'yesterday' },
    { ...measured, visibility_change: undefined },
    { ...measured, visibility_change: Number.NaN }, { ...measured, baseline_sample_count: 1 }]) {
    assert.equal(parseActionImpactReceipt(value), null);
  }
});

test('current action verdicts retain their measured date and sample counts', () => {
  assert.deepEqual(parseActionImpactReceipt(measured), measured);
  assert.equal(parseActionImpactReceipt({ ...measured, verdict: 'inconclusive', visibility_change: null,
    baseline_sample_count: 0, followup_sample_count: 0 })?.verdict, 'inconclusive');
});
