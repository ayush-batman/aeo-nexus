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
const [session, login, proxy, onboardingCheck] = await Promise.all([source('lib/convex/session.ts'), source('app/(auth)/login/page.tsx'), source('proxy.ts'), source('components/onboarding-check.tsx')]);
  assert.match(session, /await getToken\(\)/);
  assert.match(session, /if \(!token\) return null/);
  assert.doesNotMatch(session, /ENABLE_DEV_AUTH_BYPASS|DEMO_USER|DEMO_WORKSPACE/);
  assert.match(login, /NODE_ENV !== ['"]production['"][\s\S]*NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS/);
  assert.match(proxy, /NODE_ENV !== 'production'/);
  assert.match(proxy, /\['localhost', '127\.0\.0\.1'\]/);
  assert.match(proxy, /request\.cookies\.get\('dev-auth-bypass'\)/);
  assert.match(onboardingCheck, /NODE_ENV !== "production"/);
  assert.match(onboardingCheck, /\["localhost", "127\.0\.0\.1"\]/);
});

test('handled login failures stay visible without creating false console errors', async () => {
  const login = await source('app/(auth)/login/page.tsx');
  assert.match(login, /Invalid email or password\. Please check your credentials\./);
  assert.match(login, /role=["']alert["']/);
  assert.doesNotMatch(login, /console\.error\(["']Login error:/);
});

test('internal Convex token refreshes cannot exhaust the credential-attempt limiter', async () => {
  const auth = await source('convex/auth.ts');
  assert.match(auth, /['"]\/convex\/token['"]:\s*false/);
  for (const path of ['/sign-in/email', '/sign-up/email', '/request-password-reset']) {
    assert.match(auth, new RegExp(`${path.replaceAll('/', '\\/')}['"]?: \\{ window: 60, max: 5 \\}`));
  }
});

test('API key resolution revalidates user and workspace tenant bindings', async () => {
const auth = await source('convex/apiKeys.ts');
  assert.match(auth, /workspace\.organizationId !== key\.organizationId/);
  assert.match(auth, /by_organization_id_and_user_id/);
  assert.match(auth, /ctx\.db\.get\(key\.createdBy\)/);
  assert.match(auth, /role: membership\.role/);
  assert.match(auth, /api_key_invalid/);
});

test('measurement requires measure scope, atomic quota, and honest partial state', async () => {
const [scan, backend] = await Promise.all([source('app/api/v1/scan/route.ts'), source('convex/measurements.ts')]);
  assert.match(scan, /withKey\(request, 'measure'/);
  assert.match(scan, /internal\.apiWrites\.beginScan/);
  assert.match(backend, /scanQuotaReservations/);
  assert.match(backend, /request_id_conflict/);
  for (const field of ['contractVersion','requestedEngines','failedEngines','persistence']) assert.ok(scan.includes(field));
  assert.match(scan, /measurement\.status === 'all_failed'/);
  assert.match(scan, /502,[\s\S]*'all_engines_failed'/);
  assert.doesNotMatch(scan, /measurement\.visibilityScore \?\? 0/);
});

test('signed-in app scans use the same canonical multi-sample and quota contract', async () => {
const [route, legacy, status, tracker, backend] = await Promise.all([source('app/api/llm/scan/route.ts'), source('app/api/llm/scans/route.ts'), source('app/api/llm/runs/[id]/route.ts'), source('app/(dashboard)/dashboard/llm-tracker/page.tsx'), source('convex/measurements.ts')]);
  assert.match(route, /startMeasurement/); assert.match(route, /waitForMeasurement/);
  assert.match(route, /prefersRespondAsync/); assert.match(route, /status: 202/);
  assert.match(route, /samples: 4/); assert.match(route, /measurement\.status === 'all_failed'/);
  assert.match(backend, /requireRole\(tenant, 'editor'\)/); assert.match(backend, /scanQuotaReservations/);
  assert.match(legacy, /runCanonicalScan\(request\)/);
  assert.match(status, /progress: run\.progress/);
  assert.match(tracker, /Prefer: 'respond-async'/); assert.match(tracker, /waitForMeasurementJob/);
  assert.doesNotMatch(route, /scanLLM\(|calculateVisibilityScore|scansThisWeek/);
});

test('service-role mutation routes enforce owner or admin role', async () => {
for (const path of ['convex/apiKeys.ts', 'convex/workspaces.ts', 'convex/alerts.ts']) {
    const backend = await source(path);
    assert.match(backend, /requireRole\((?:ctx\.tenant|tenant), 'admin'\)/);
    assert.match(backend, /requireWorkspace|organizationId/);
  }
  const roles = await source('convex/lib/rolePolicy.ts');
  assert.match(roles, /owner/); assert.match(roles, /admin/);
});

test('alert settings reject direct member writes and unsupported alert types', async () => {
const [backend, settings] = await Promise.all([source('convex/alerts.ts'), source('app/(dashboard)/dashboard/settings/page.tsx')]);
  assert.match(backend, /requireRole\(ctx\.tenant, 'admin'\)/);
  assert.match(backend, /!alertTypes\.includes\(p\.alert_type\)/);
  assert.match(backend, /new Set\(args\.preferences/);
  assert.match(backend, /invalid_preferences/);
  assert.doesNotMatch(settings, /citation_lost|daily_report|brand_forum_mention|hot_thread/);
  assert.match(settings, /sentiment_drift/);
});

test('new workspace activation is atomically queued instead of awaited in the request', async () => {
const [route, workspace, activation, recurrence] = await Promise.all([
    source('app/api/workspaces/route.ts'), source('convex/workspaces.ts'), source('convex/activation.ts'), source('convex/crons.ts')]);
  assert.doesNotMatch(route, /runVisibilityMeasurement|scanLLM\(/);
  assert.match(workspace, /ctx\.db\.insert\('measurementJobs'/);
  assert.match(activation, /prompts\.length < 3 \|\| prompts\.length > 5/);
  assert.match(activation, /beginMeasurement/); assert.match(activation, /samples: 4/);
  assert.match(activation, /initial_visibility/);
  assert.match(recurrence, /reconcileInitialJobs/);
});

test('workspace brand limits are enforced under an organization lock', async () => {
const workspace = await source('convex/workspaces.ts');
  assert.match(workspace, /export const create = tenantMutation/);
  assert.match(workspace, /ctx\.tenant\.organization\.plan === 'free'/);
  assert.match(workspace, /by_organization_id/);
  assert.match(workspace, /status: 'denied' as const, limit: 1/);
  assert.match(workspace, /ctx\.db\.insert\('workspaces'/);
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
const [page, signup, callback, google] = await Promise.all([source('app/(auth)/signup/page.tsx'),source('app/api/auth/signup/route.ts'),source('app/auth/callback/route.ts'),source('components/auth/google-button.tsx')]);
  assert.match(page, /No checkout or charge happens during signup/); assert.match(page, /minLength=\{8\}/);
  assert.match(signup, /callbackURL: plan/); assert.match(signup, /onboarding\?plan=/);
  assert.match(callback, /next\.searchParams\.set\('plan', selectedPlan\)/);
  assert.match(google, /callback\.searchParams\.set\('plan'/);
  for (const code of [page,signup,callback,google]) assert.doesNotMatch(code, /stripe\/checkout|razorpay\/create-order/);
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
