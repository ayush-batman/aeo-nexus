import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_TRAFFIC_SUMMARY_PAGES, summarizeTrafficEvents } from '../../lib/analytics/traffic-summary';

test('traffic summary counts only pageviews and keeps the latest 50 events', async () => {
  const cursors: Array<string | null> = [];
  const summary = await summarizeTrafficEvents<{ event_type: string; ai_source: string | null }>(async (cursor) => {
    cursors.push(cursor);
    return cursor === null
      ? { page: [
        { event_type: 'pageview', ai_source: 'chatgpt' },
        { event_type: 'click', ai_source: 'chatgpt' },
      ], isDone: false, continueCursor: 'next' }
      : { page: [{ event_type: 'pageview', ai_source: null }], isDone: true, continueCursor: '' };
  });
  assert.deepEqual(cursors, [null, 'next']);
  assert.equal(summary.totalVisits, 2);
  assert.equal(summary.aiVisits, 1);
  assert.deepEqual({ ...summary.sources }, { chatgpt: 1, other: 1 });
  assert.equal(summary.events.length, 2);
  assert.equal(summary.examinedEvents, 3);
  assert.equal(summary.partial, false);
});

test('traffic summary stops after ten pages and labels incomplete totals', async () => {
  let calls = 0;
  const summary = await summarizeTrafficEvents(async () => {
    calls++;
    return { page: Array.from({ length: 500 }, () => ({ event_type: 'pageview', ai_source: 'gemini' })),
      isDone: false, continueCursor: `page-${calls}` };
  });
  assert.equal(calls, MAX_TRAFFIC_SUMMARY_PAGES);
  assert.equal(summary.totalVisits, 5000);
  assert.equal(summary.aiVisits, 5000);
  assert.equal(summary.events.length, 50);
  assert.equal(summary.examinedEvents, 5000);
  assert.equal(summary.partial, true);
});

test('traffic summary fails rather than repeating a page without a cursor', async () => {
  await assert.rejects(() => summarizeTrafficEvents(async () => ({
    page: [{ event_type: 'pageview', ai_source: null }], isDone: false, continueCursor: '',
  })), /missing_traffic_cursor/);
});

test('traffic summary rejects a cursor loop instead of double-counting events', async () => {
  let calls = 0;
  await assert.rejects(() => summarizeTrafficEvents(async () => {
    calls++;
    return { page: [{ event_type: 'pageview', ai_source: 'chatgpt' }], isDone: false,
      continueCursor: calls === 1 ? 'page-one' : calls === 2 ? 'page-two' : 'page-one' };
  }), /repeated_traffic_cursor/);
  assert.equal(calls, 3);
});
