import assert from 'node:assert/strict';
import test from 'node:test';
import { loadScanSummaries, MAX_ANALYTICS_SAMPLES } from '../../lib/analytics/load-scan-summaries';

test('analytics loads every page before showing a complete result', async () => {
  const cursors: Array<string | null> = [];
  const rows = await loadScanSummaries(async (cursor) => {
    cursors.push(cursor);
    return cursor === null
      ? { page: [1, 2], isDone: false, continueCursor: 'next' }
      : { page: [3], isDone: true, continueCursor: '' };
  });
  assert.deepEqual(cursors, [null, 'next']);
  assert.deepEqual(rows, [1, 2, 3]);
});

test('analytics refuses incomplete or looping history instead of showing partial totals', async () => {
  await assert.rejects(() => loadScanSummaries(async () => ({
    page: [1], isDone: false, continueCursor: 'same',
  })), /complete scan history/);
  await assert.rejects(() => loadScanSummaries(async () => ({
    page: Array.from({ length: MAX_ANALYTICS_SAMPLES }, (_, index) => index),
    isDone: false, continueCursor: 'next',
  })), /complete scan history/);
  await assert.rejects(() => loadScanSummaries(async () => {
    throw new Error('later page failed');
  }), /later page failed/);
});
