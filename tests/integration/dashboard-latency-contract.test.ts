import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('browser smoke emits bounded structured latency samples', async () => {
  const script = await source('scripts/convex/browser-smoke.mjs');

  assert.match(script, /AELO_PERF_JSON/);
  assert.match(script, /api\/dashboard\/stats/);
  assert.match(script, /AbortSignal\.timeout\(20000\)/);
  assert.match(script, /waitForLoadState\('networkidle'/);
  assert.doesNotMatch(script, /password[,:]\s*(email|process\.env\.AELO_LOCAL_TEST_PASSWORD)/i);
});

test('independent measurement samples are queued in bounded parallel work', async () => {
  const workflow = await source('convex/measurementWorkflow.ts');
  assert.match(workflow, /const sampleJobs/);
  assert.match(workflow, /await Promise\.all\(sampleJobs\)/);
  assert.doesNotMatch(workflow, /for \(let sampleNumber[\s\S]{0,500}await Promise\.all\(input\.platforms/);
});

test('activation prompt lookup and crawler traffic reads are bounded', async () => {
  const [activation, schema, crawler] = await Promise.all([
    source('convex/activation.ts'), source('convex/schema.ts'), source('convex/crawlerActions.ts'),
  ]);

  assert.match(schema, /by_workspace_id_and_category_and_prompt/);
  assert.match(activation, /withIndex\('by_workspace_id_and_category_and_prompt'/);
  assert.doesNotMatch(activation, /q\.field\('prompt'\)/);
  assert.match(crawler, /MAX_TRAFFIC_EVENTS\s*=\s*10_000/);
  assert.match(crawler, /partial\s*=\s*!page\.isDone\s*&&\s*totalEvents\s*>=\s*MAX_TRAFFIC_EVENTS/);
});

test('overview reads its live summary directly after the authorized bootstrap', async () => {
  const [page, route, backend] = await Promise.all([
    source('app/(dashboard)/dashboard/page.tsx'),
    source('app/api/dashboard/stats/route.ts'),
    source('convex/dashboard.ts'),
  ]);

  assert.match(page, /useDashboardBootstrap/);
  assert.match(page, /const workspaceId = bootstrap\?\.workspaceId/);
  assert.match(page, /useQuery\([\s\S]*api\.dashboard\.summary/);
  assert.doesNotMatch(page, /fetch\(`?\/api\/dashboard\/stats/);
  assert.match(route, /UUID_PATTERN\.test\(requestedWorkspaceId\)/);
  assert.match(route, /requestedWorkspaceId \?\? \(await getConvexWorkspaceContext\(\)\)\?\.workspaceId/);
  assert.match(route, /fetchAuthQuery\(api\.dashboard\.summary/);
  assert.match(backend, /requireWorkspace\(ctx, ctx\.tenant, args\.workspaceId\)/);
});

test('workspace switching uses one tenant-bound read and never reloads after a denied switch', async () => {
  const [route, backend, sidebar] = await Promise.all([
    source('app/api/workspaces/switch/route.ts'),
    source('convex/workspaces.ts'),
    source('components/dashboard/sidebar.tsx'),
  ]);

  assert.match(route, /fetchAuthQuery\(api\.workspaces\.get, \{ workspaceId: body\.workspaceId \}\)/);
  assert.doesNotMatch(route, /getConvexWorkspaceContext/);
  assert.match(backend, /export const get = tenantQuery\(/);
  assert.match(backend, /requireWorkspace\(ctx, ctx\.tenant, args\.workspaceId\)/);
  assert.match(sidebar, /if \(!res\.ok\) throw new Error\("Workspace switch was denied\."\)/);
  assert.ok(sidebar.indexOf('if (!res.ok) throw') < sidebar.indexOf('window.location.assign(new URL("/dashboard"'));
  assert.match(sidebar, /role="alert"[^>]*>\{switchError\}/);
});

test('brand switcher can load older tenant-bound brands without changing the legacy list response', async () => {
  const [route, backend, sidebar] = await Promise.all([
    source('app/api/workspaces/route.ts'),
    source('convex/workspaces.ts'),
    source('components/dashboard/sidebar.tsx'),
  ]);
  assert.match(backend, /export const listPage = tenantQuery/);
  assert.match(backend, /by_organization_id_and_created_at/);
  assert.match(route, /searchParams\.get\('page'\) === '1'[\s\S]*api\.workspaces\.listPage/);
  assert.match(route, /nextCursor: result\.isDone \? null : result\.continueCursor/);
  assert.match(route, /return NextResponse\.json\(\{ workspaces: workspaces\.map\(legacyWorkspace\) \}/);
  assert.match(sidebar, /Load older brands/);
  assert.match(sidebar, /params\.set\("cursor", cursor\)/);
  assert.match(sidebar, /Retry loading brands/);
  assert.match(sidebar, /focusAfterWorkspacePageRef\.current = page\[0\]\?\.id/);
  assert.match(sidebar, /target\?\.focus\(\)/);
});

test('warm dashboard navigation rechecks access without a blocking workspace spinner', async () => {
  const guard = await source('components/onboarding-check.tsx');

  assert.match(guard, /\[attempt, pathname, router\]/);
  assert.match(guard, /if \(!readyBootstrap\.current\) setState\("checking"\)/);
  assert.match(guard, /AbortSignal\.any\(\[controller\.signal, AbortSignal\.timeout\(20_000\)\]\)/);
  assert.ok(guard.indexOf('if (controller.signal.aborted) return;') < guard.indexOf('if (response.status === 401)'));
  assert.match(guard, /if \(response\.status === 401\) \{[\s\S]*?readyBootstrap\.current = null;[\s\S]*?setState\("checking"\);[\s\S]*?router\.replace\("\/login"\)/);
  assert.match(guard, /if \(!response\.ok\) throw new Error/);
  assert.match(guard, /if \(!isDashboardBootstrap\(data\)\) throw new Error/);
  assert.doesNotMatch(guard, /response\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(guard, /readyBootstrap\.current = data/);
  assert.match(guard, /setState\("error"\)/);
  assert.doesNotMatch(guard, /error\.name === "AbortError"/);
});

test('workspace bootstrap records auth and backend timings without user or provider payloads', async () => {
  const [route, session] = await Promise.all([
    source('app/api/onboarding/context/route.ts'),
    source('lib/convex/session.ts'),
  ]);

  assert.match(route, /getConvexDashboardBootstrap\(timings\)/);
  assert.match(route, /if \(!getSessionCookie\(request\)\)/);
  assert.ok(route.indexOf('if (!getSessionCookie(request))') < route.indexOf('getConvexDashboardBootstrap(timings)'));
  assert.match(route, /workspaceBootstrapTelemetry\(response\.status, performance\.now\(\) - started, timings\)/);
  assert.match(route, /response\.headers\.set\('Server-Timing', telemetry\.serverTiming\)/);
  assert.match(route, /response\.headers\.set\('Cache-Control', 'no-store'\)/);
  assert.match(session, /timings\.tokenMs = performance\.now\(\) - tokenStarted/);
  assert.match(session, /timings\.backendMs = performance\.now\(\) - backendStarted/);
  assert.match(session, /timings\.provisioned = true/);
  assert.doesNotMatch(route, /console\.(?:info|log|error)\([^\n]*(?:context|error\.message|token|workspaceId)/);
});

test('notification badge does not page through full history on every refresh', async () => {
  const [route, alerts, header] = await Promise.all([
    source('app/api/alerts/notifications/route.ts'),
    source('convex/alerts.ts'),
    source('components/dashboard/header.tsx'),
  ]);
  assert.match(route, /Promise\.all\(\[/);
  assert.match(route, /numItems: 20/);
  assert.match(route, /api\.alerts\.unreadBadgeCount/);
  assert.match(route, /unreadCountMayBeHigher: unreadCount === 10/);
  assert.doesNotMatch(route, /while \(cursor\)/);
  assert.match(alerts, /export const unreadBadgeCount = tenantQuery/);
  assert.match(alerts, /by_workspace_id_and_read[\s\S]*\.take\(10\)/);
  assert.match(header, /unreadCount > 9 \? "9\+" : unreadCount/);
  assert.match(header, /if \(unreadCount >= 10\) void fetchNotifications\(\)/);
});

test('marking all notifications uses bounded server requests and waits for completion', async () => {
  const [route, header] = await Promise.all([
    source('app/api/alerts/notifications/route.ts'),
    source('components/dashboard/header.tsx'),
  ]);
  assert.match(route, /const \{ more \} = await fetchAuthMutation\(api\.alerts\.markRead/);
  assert.match(route, /success: true, more/);
  assert.doesNotMatch(route, /while \(more\)|do \{/);
  assert.match(header, /for \(let batch = 0; batch < 50; batch\+\+\)/);
  assert.match(header, /if \(!result\.more\) \{/);
  assert.match(header, /if \(!complete\) throw new Error/);
  assert.match(header, /await fetchNotifications\(\)/);
  assert.doesNotMatch(header, /setUnreadCount\(0\)/);
});

test('install analytics bounds event reads and labels incomplete traffic totals', async () => {
  const [route, helper, installTab] = await Promise.all([
    source('app/api/analytics/summary/route.ts'),
    source('lib/analytics/traffic-summary.ts'),
    source('components/dashboard/settings/install-tab.tsx'),
  ]);
  assert.match(route, /summarizeTrafficEvents\(/);
  assert.match(route, /numItems: 500/);
  assert.match(helper, /MAX_TRAFFIC_SUMMARY_PAGES = 10/);
  assert.match(helper, /partial: true/);
  assert.match(installTab, /setSummaryPartial\(summary\.partial\)/);
  assert.match(installTab, /Only the newest \{examinedEvents\.toLocaleString\(\)\} events were checked/);
  assert.doesNotMatch(route, /while \(cursor\)/);
});
