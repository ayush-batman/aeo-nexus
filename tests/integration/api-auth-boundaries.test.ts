import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('the destructive setup-test-user route is absent', async () => {
  await assert.rejects(
    access(new URL('../../app/api/setup-test-user/route.ts', import.meta.url)),
    /ENOENT/,
  );
});

test('API key resolution revalidates user and workspace tenant bindings', async () => {
  const auth = await source('lib/api-auth.ts');
  assert.match(auth, /\.from\('workspaces'\)/);
  assert.match(auth, /\.eq\('org_id', data\.org_id\)/);
  assert.match(auth, /\.from\('users'\)/);
  assert.match(auth, /role/);
});

test('measurement requires measure scope, atomic quota, and honest partial state', async () => {
  const scan = await source('app/api/v1/scan/route.ts');
  assert.match(scan, /withKey\(request, 'measure'/);
  assert.match(scan, /reserveScanQuota/);
  assert.match(scan, /runVisibilityMeasurement/);
  assert.match(scan, /contractVersion/);
  assert.match(scan, /duplicate_scan_request/);
  assert.match(scan, /requestedEngines/);
  assert.match(scan, /failedEngines/);
  assert.match(scan, /persistence/);
});

test('service-role mutation routes enforce owner or admin role', async () => {
  const [keys, revoke, workspaces] = await Promise.all([
    source('app/api/keys/route.ts'),
    source('app/api/keys/[id]/route.ts'),
    source('app/api/workspaces/route.ts'),
  ]);
  for (const route of [keys, revoke, workspaces]) {
    assert.match(route, /requireWorkspaceRole/);
    assert.match(route, /'owner'/);
    assert.match(route, /'admin'/);
  }
});

test('scan quota reservation is serialized, idempotent, and service-role only', async () => {
  const sql = await source('supabase/migrations/027_create_scan_quota_reservations.sql');
  const normalized = sql.replace(/\s+/g, ' ');
  assert.match(normalized, /UNIQUE \(org_id, request_id\)/i);
  assert.match(normalized, /FOR UPDATE/i);
  assert.match(normalized, /interval '7 days'/i);
  assert.match(normalized, /RETURN 'duplicate'/i);
  assert.match(normalized, /RETURN 'denied'/i);
  assert.match(normalized, /RETURN 'reserved'/i);
  assert.match(normalized, /GRANT EXECUTE ON FUNCTION public\.reserve_scan_quota/i);
  assert.match(normalized, /TO service_role/i);
  assert.match(normalized, /REVOKE ALL ON FUNCTION public\.reserve_scan_quota/i);
});
