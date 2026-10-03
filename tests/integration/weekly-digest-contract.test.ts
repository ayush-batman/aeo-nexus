import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('weekly delivery is claimed once and records failures honestly', async () => {
const [jobs, worker, delivery, sender] = await Promise.all([
  readFile(new URL('../../convex/weekly.ts',import.meta.url),'utf8'),
  readFile(new URL('../../convex/weeklyActions.ts',import.meta.url),'utf8'),
  readFile(new URL('../../convex/mail.ts',import.meta.url),'utf8'),
  readFile(new URL('../../convex/mailActions.ts',import.meta.url),'utf8')]);
 assert.match(jobs,/by_workspace_kind_week/); assert.match(jobs,/if\(existing\)continue/);
 assert.match(worker,/buildWeeklyDecisionInbox/); assert.match(worker,/if\(!messages\.length\)return null/);
 assert.match(delivery,/by_workspace_recipient_key/);
 assert.match(delivery,/status:'failed'/);
 assert.match(sender,/idempotencyKey:/);
 assert.match(sender,/response\.error \|\| !response\.data\?\.id/);
 assert.match(sender,/internal\.mail\.accepted/);
});
