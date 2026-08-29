import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWeeklyDecisionInbox } from '../../lib/weekly-inbox';

const now = new Date('2026-08-29T12:00:00.000Z');
function samples(daysAgo: number, mentioned: boolean, count = 4) {
  return Array.from({ length: count }, (_, index) => ({
    prompt: 'best AEO tracker', platform: 'gemini', brand_mentioned: mentioned,
    citations: [], created_at: new Date(now.getTime() - (daysAgo * 86400000) - index).toISOString(),
  }));
}

test('weekly inbox includes only non-overlapping four-sample cohorts', () => {
  const material = buildWeeklyDecisionInbox([...samples(2, true), ...samples(9, false)], [], now);
  assert.equal(material.items.length, 1);
  assert.equal(material.items[0].direction, 'improved');
  assert.equal(material.items[0].current.sampleCount, 4);

  const uncertain = buildWeeklyDecisionInbox([...samples(2, true, 3), ...samples(9, false)], [], now);
  assert.equal(uncertain.items.length, 0);
});

test('weekly inbox links matching open work as the next decision', () => {
  const inbox = buildWeeklyDecisionInbox([...samples(2, false), ...samples(9, true)], [{
    id: 'action-1', title: 'Earn a trusted mention', owner_id: 'user-1',
    target_prompts: ['best AEO tracker'], status: 'in_progress',
  }], now);
  assert.equal(inbox.items[0].direction, 'regressed');
  assert.equal(inbox.items[0].action?.title, 'Earn a trusted mention');
});
