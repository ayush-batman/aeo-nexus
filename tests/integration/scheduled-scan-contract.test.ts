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
  const [route, leaseSql] = await Promise.all([
    source('app/api/cron/process-scans/route.ts'),
    source('supabase/migrations/035_reliable_scan_leases.sql'),
  ]);
  assert.match(route, /cron_not_configured/);
  assert.match(route, /claim_due_scheduled_scans/);
  assert.match(route, /reserveScanQuota/);
  assert.match(route, /getEntitlements/);
  assert.match(route, /runVisibilityMeasurement/);
  assert.match(route, /samples: 4/);
  assert.match(route, /measurement\.persistence\.status/);
  assert.match(route, /claim_token/);
  assert.match(route, /p_limit:\s*1/);
  assert.match(route, /renew_scheduled_scan_claim/);
  assert.match(leaseSql, /CREATE OR REPLACE FUNCTION public\.renew_scheduled_scan_claim/i);
  assert.match(leaseSql, /claim_token = p_claim_token/i);
  assert.match(leaseSql, /TO service_role/i);
  assert.doesNotMatch(route, /scanLLM\(/);
  assert.doesNotMatch(route, /\.from\('scheduled_scans'\)\s*\.select/);
});

test('cookie schedule mutations require an editor role and validate entitled engines', async () => {
  const [collection, member, migration] = await Promise.all([
    source('app/api/llm/scheduled/route.ts'),
    source('app/api/llm/scheduled/[id]/route.ts'),
    source('supabase/migrations/033_secure_scheduled_scan_mutations.sql'),
  ]);
  for (const route of [collection, member]) {
    assert.match(route, /getCurrentWorkspaceContext/);
    assert.match(route, /requireWorkspaceRole/);
    assert.match(route, /createAdminClient/);
  }
  assert.match(collection, /getEntitlements/);
  assert.match(collection, /getAvailablePlatforms/);
  assert.match(collection, /engine_not_entitled/);
  assert.match(collection, /prompt\.length > 2_000/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.scheduled_scans FROM authenticated/i);
});
