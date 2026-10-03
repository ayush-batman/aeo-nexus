import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateMentionConfidence } from '../../lib/measurement/confidence';

test('confidence is none without evidence and low for a single sample', () => {
  assert.deepEqual(estimateMentionConfidence(0, 0), {
    level: 'none', sampleCount: 0, mentions: 0, mentionRate: null, interval: null,
  });
  assert.equal(estimateMentionConfidence(1, 1).level, 'low');
});

test('confidence increases only with enough samples and a sufficiently narrow interval', () => {
  const fourOfFour = estimateMentionConfidence(4, 4);
  assert.equal(fourOfFour.level, 'low');
  assert.ok(fourOfFour.interval && fourOfFour.interval.lower < 1 && fourOfFour.interval.upper === 1);
  assert.equal(estimateMentionConfidence(8, 8).level, 'medium');
  assert.equal(estimateMentionConfidence(4, 8).level, 'low');
  assert.equal(estimateMentionConfidence(20, 20).level, 'high');
});

test('invalid mention counts are rejected', () => {
  assert.throws(() => estimateMentionConfidence(2, 1));
  assert.throws(() => estimateMentionConfidence(-1, 4));
});
