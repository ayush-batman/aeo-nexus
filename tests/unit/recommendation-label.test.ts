import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendationLabel } from '../../lib/measurement/recommendation-label';

test('receipts separate recommendation from mention and never mark legacy data negative', () => {
  assert.equal(recommendationLabel('recommended'), 'Recommended in this answer');
  assert.equal(recommendationLabel('not_recommended'), 'Named, but not recommended');
  assert.equal(recommendationLabel('unassessed'), 'Recommendation not assessed');
  assert.equal(recommendationLabel(null), 'Recommendation not assessed');
  assert.equal(recommendationLabel(undefined), 'Recommendation not assessed');
});
