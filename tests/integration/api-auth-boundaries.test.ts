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

test('development auth bypass is impossible in production', async () => {
  const dataAccess = await source('lib/data-access.ts');
  const login = await source('app/(auth)/login/page.tsx');
  assert.match(dataAccess, /NODE_ENV !== ['"]production['"][\s\S]*NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS/);
  assert.match(login, /NODE_ENV !== ['"]production['"][\s\S]*NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS/);
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
  assert.match(scan, /measurement\.status === 'all_failed'/);
  assert.match(scan, /new ApiV1Error\([\s\S]*502,[\s\S]*'all_engines_failed'/);
  assert.doesNotMatch(scan, /measurement\.visibilityScore \?\? 0/);
});

test('signed-in app scans use the same canonical multi-sample and quota contract', async () => {
  const [route, legacyRoute, onboarding] = await Promise.all([
    source('app/api/llm/scan/route.ts'),
    source('app/api/llm/scans/route.ts'),
    source('app/(dashboard)/onboarding/page.tsx'),
  ]);
  assert.match(route, /runVisibilityMeasurement/);
  assert.match(route, /samples: 4/);
  assert.match(route, /reserveScanQuota/);
  assert.match(route, /measurement\.status === 'all_failed'/);
  assert.match(route, /requireWorkspaceRole\(context, \['owner', 'admin', 'editor'\]\)/);
  assert.doesNotMatch(route, /scansThisWeek/);
  assert.doesNotMatch(route, /calculateVisibilityScore/);
  assert.match(legacyRoute, /runCanonicalScan\(request\)/);
  assert.doesNotMatch(legacyRoute, /scanLLM\(/);
  assert.match(onboarding, /engine\.mentionRate/);
  assert.doesNotMatch(onboarding, /r\.confidence \?\? 0\.6/);
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

test('new workspace activation also uses a canonical four-sample measurement', async () => {
  const route = await source('app/api/workspaces/route.ts');
  assert.match(route, /runVisibilityMeasurement/);
  assert.match(route, /samples: 4/);
  assert.match(route, /reserveScanQuota/);
  assert.doesNotMatch(route, /scanLLM\(/);
});

test('MCP preserves measurement and API failure detail', async () => {
  const [server, client] = await Promise.all([
    source('mcp-server/src/index.ts'),
    source('mcp-server/src/client.ts'),
  ]);
  assert.match(server, /measurement\.v1/);
  assert.match(server, /e\.status/);
  assert.match(server, /retryAfter/);
  assert.match(client, /res\.status === 429/);
  assert.match(client, /retry-after/);
  assert.match(server, /provider_citation means the provider supplied it/);
});

test('pricing intent survives password and OAuth signup without starting checkout', async () => {
  const [signupPage, signupRoute, callback, google] = await Promise.all([
    source('app/(auth)/signup/page.tsx'),
    source('app/api/auth/signup/route.ts'),
    source('app/auth/callback/route.ts'),
    source('components/auth/google-button.tsx'),
  ]);
  assert.match(signupPage, /No checkout or charge happens during signup/);
  assert.match(signupPage, /selectedPlan/);
  assert.match(signupPage, /minLength=\{8\}/);
  assert.match(signupRoute, /selected_plan: planIntent/);
  assert.match(callback, /selected_plan: selectedPlan/);
  assert.match(google, /callback\.searchParams\.set\('plan'/);
  for (const sourceText of [signupPage, signupRoute, callback, google]) {
    assert.doesNotMatch(sourceText, /stripe\/checkout|razorpay\/create-order/);
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
