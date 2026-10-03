import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/026_create_billing_webhook_events.sql',
  import.meta.url,
);

test('billing events are idempotent and applied atomically by the database', async () => {
  const sql = (await readFile(migrationUrl, 'utf8')).replace(/\s+/g, ' ');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.billing_webhook_events/i);
  assert.match(sql, /UNIQUE \(provider, event_id\)/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.apply_billing_event/i);
  assert.match(sql, /ON CONFLICT \(provider, event_id\) DO NOTHING/i);
  assert.match(sql, /occurred_at > p_occurred_at/i);
  assert.match(sql, /UPDATE public\.organizations/i);
  assert.match(sql, /IF NOT FOUND THEN RAISE EXCEPTION/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.apply_billing_event/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.apply_billing_event/i);
});
