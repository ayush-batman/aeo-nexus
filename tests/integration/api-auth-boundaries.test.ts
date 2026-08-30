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
  const [keys, revoke, workspaces, alertPreferences] = await Promise.all([
    source('app/api/keys/route.ts'),
    source('app/api/keys/[id]/route.ts'),
    source('app/api/workspaces/route.ts'),
    source('app/api/alerts/preferences/route.ts'),
  ]);
  for (const route of [keys, revoke, workspaces, alertPreferences]) {
    assert.match(route, /requireWorkspaceRole/);
    assert.match(route, /'owner'/);
    assert.match(route, /'admin'/);
  }
});

test('alert settings reject direct member writes and unsupported alert types', async () => {
  const [route, migration, settings] = await Promise.all([
    source('app/api/alerts/preferences/route.ts'),
    source('supabase/migrations/20260830050607_restrict_alert_preferences.sql'),
    source('app/(dashboard)/dashboard/settings/page.tsx'),
  ]);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE[\s\S]*FROM authenticated/i);
  assert.match(migration, /FOR SELECT[\s\S]*TO authenticated/i);
  assert.match(route, /ALERT_TYPES\.has/);
  assert.match(route, /unsupported or duplicate alert types/);
  assert.match(route, /createAdminClient/);
  assert.doesNotMatch(settings, /citation_lost|daily_report|brand_forum_mention|hot_thread/);
  assert.match(settings, /sentiment_drift/);
});

test('new workspace activation is atomically queued instead of awaited in the request', async () => {
  const [route, worker, jobs, migration, vercel] = await Promise.all([
    source('app/api/workspaces/route.ts'),
    source('app/api/cron/process-measurement-jobs/route.ts'),
    source('lib/measurement/jobs.ts'),
    source('supabase/migrations/036_activation_jobs.sql'),
    source('vercel.json'),
  ]);
  assert.match(route, /measurementStatus:\s*'queued'/);
  assert.match(route, /create_workspace_with_plan_limit/);
  assert.doesNotMatch(route, /runVisibilityMeasurement|reserveScanQuota|getAvailablePlatforms/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.measurement_jobs/i);
  assert.match(migration, /UNIQUE\s*\(workspace_id, purpose\)/i);
  assert.match(migration, /INSERT INTO public\.measurement_jobs/i);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/i);
  assert.match(jobs, /claim_measurement_jobs/);
  assert.match(jobs, /finish_measurement_job/);
  assert.match(worker, /runVisibilityMeasurement/);
  assert.match(worker, /samples:\s*4/);
  assert.match(worker, /reserveScanQuota/);
  assert.match(worker, /cron_not_configured/);
  assert.match(vercel, /process-measurement-jobs/);
});

test('workspace brand limits are enforced under an organization lock', async () => {
  const [route, sql] = await Promise.all([
    source('app/api/workspaces/route.ts'),
    source('supabase/migrations/034_atomic_actions_and_workspace_limits.sql'),
  ]);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_workspace_with_plan_limit/i);
  assert.match(sql, /FROM public\.organizations[\s\S]*FOR UPDATE/i);
  assert.match(sql, /COUNT\(\*\)[\s\S]*FROM public\.workspaces/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_workspace_with_plan_limit[\s\S]*TO service_role/i);
  assert.match(route, /\.rpc\(['"]create_workspace_with_plan_limit['"]/);
  assert.doesNotMatch(route, /select\(['"]\*['"], \{ count: ['"]exact['"]/);
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
