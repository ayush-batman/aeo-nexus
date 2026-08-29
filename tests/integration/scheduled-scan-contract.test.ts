import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('API schedules resolve configured entitled engines instead of saving an empty list', async () => {
  const route = await source('app/api/v1/scans/schedule/route.ts');
  assert.match(route, /getAvailablePlatforms/);
  assert.match(route, /getEntitlements/);
  assert.match(route, /no_engines_available/);
  assert.doesNotMatch(route, /platforms:\s*\[\]/);
});

test('scheduled scan claims are leased atomically and service-role only', async () => {
  const sql = await source('supabase/migrations/028_claim_scheduled_scans.sql');
  const normalized = sql.replace(/\s+/g, ' ');
  assert.match(normalized, /FOR UPDATE SKIP LOCKED/i);
  assert.match(normalized, /claim_expires_at/i);
  assert.match(normalized, /REVOKE ALL ON FUNCTION public\.claim_due_scheduled_scans/i);
  assert.match(normalized, /GRANT EXECUTE ON FUNCTION public\.claim_due_scheduled_scans/i);
  assert.match(normalized, /TO service_role/i);
});

test('scan cron fails closed and consumes only atomically claimed schedules', async () => {
  const route = await source('app/api/cron/process-scans/route.ts');
  assert.match(route, /cron_not_configured/);
  assert.match(route, /claim_due_scheduled_scans/);
  assert.match(route, /reserveScanQuota/);
  assert.match(route, /getEntitlements/);
  assert.match(route, /runVisibilityMeasurement/);
  assert.match(route, /samples: 4/);
  assert.match(route, /measurement\.persistence\.status/);
  assert.match(route, /claim_token/);
  assert.doesNotMatch(route, /scanLLM\(/);
  assert.doesNotMatch(route, /\.from\('scheduled_scans'\)\s*\.select/);
});
