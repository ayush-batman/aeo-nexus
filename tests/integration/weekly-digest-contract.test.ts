import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('weekly delivery is claimed once and records failures honestly', async () => {
  const root = process.cwd();
  const sql = await readFile(`${root}/supabase/migrations/031_weekly_digest_delivery.sql`, 'utf8');
  const cron = await readFile(`${root}/app/api/cron/weekly-digest/route.ts`, 'utf8');
  assert.match(sql, /UNIQUE\s*\(workspace_id, week_start\)/i);
  assert.match(sql, /claim_weekly_digest_delivery/i);
  assert.match(sql, /status = 'failed'/i);
  assert.match(cron, /buildWeeklyDecisionInbox/);
  assert.match(cron, /inbox\.items\.length === 0/);
  assert.match(cron, /weekly_digest_failed/);
  assert.doesNotMatch(cron, /sent\+\+[\s\S]*sendWeeklyDigestEmail/);
});
