import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = process.cwd();

test('dashboard shell exposes five primary jobs and an accessible all-tools drawer', async () => {
  const shell = await readFile(`${root}/components/dashboard/dashboard-shell.tsx`, 'utf8');
  const sidebar = await readFile(`${root}/components/dashboard/sidebar.tsx`, 'utf8');
  const navigation = await readFile(`${root}/components/dashboard/dashboard-navigation.tsx`, 'utf8');
  assert.match(shell, /<DashboardNavigation/);
  assert.match(shell, /drawerOnly/);
  assert.match(navigation, /aria-label="Primary dashboard navigation"/);
  for (const job of ['Overview', 'Prompts & Scans', 'Sources', 'Actions', 'Reports & Settings']) assert.match(navigation, new RegExp(job));
  assert.match(navigation, /aria-label="Open all dashboard tools"/);
  assert.match(sidebar, /aria-modal/);
  assert.match(sidebar, /event\.key === ["']Escape["']/);
  assert.match(sidebar, /event\.key !== ["']Tab["']/);
  assert.match(sidebar, /document\.body\.style\.overflow/);
  assert.match(sidebar, /returnFocusRef\.current\?\.focus/);
  assert.match(sidebar, /lg:translate-x-0/);
  assert.match(shell, /href=["']#dashboard-content["']/);
  assert.match(shell, /id=["']dashboard-content["']/);
});

test('dashboard header and navigation have semantic, reachable controls', async () => {
  const [header, navigation] = await Promise.all([
    readFile(`${root}/components/dashboard/header.tsx`, 'utf8'),
    readFile(`${root}/components/dashboard/dashboard-navigation.tsx`, 'utf8'),
  ]);
  assert.match(navigation, /aria-label={`Use/);
  assert.match(navigation, /min-h-11 min-w-11/);
  assert.doesNotMatch(header, /placeholder=["']Search\.\.\.["']/);
  assert.doesNotMatch(header, /<div[\s\S]{0,160}onClick=\{\(\) => openNotification/);
  assert.match(header, /role=["']alert["']/);
});

test('dashboard loading and onboarding failures remain explicit and retryable', async () => {
const [loading, gate, route, errors] = await Promise.all([
  readFile(new URL('../../app/(dashboard)/loading.tsx', import.meta.url),'utf8'),
  readFile(new URL('../../components/onboarding-check.tsx', import.meta.url),'utf8'),
  readFile(new URL('../../app/api/alerts/notifications/route.ts', import.meta.url),'utf8'),
  readFile(new URL('../../lib/convex/http.ts', import.meta.url),'utf8')]);
 assert.match(loading,/role=["']status["']/); assert.match(gate,/role=["']alert["']/); assert.match(gate,/Retry/);
 assert.match(gate,/controller\.signal\.aborted/);
 assert.match(gate,/if \(pathname === ["']\/onboarding["']\)/);
 assert.match(gate,/\[attempt, pathname, router\]/);
 assert.doesNotMatch(gate,/initialPathname/);
 assert.match(route,/convexRouteError/); assert.match(errors,/status: 503/);
});

test('core controls meet target sizes and respect reduced motion', async () => {
  const [button, dialog, styles] = await Promise.all([
    readFile(`${root}/components/ui/button.tsx`, 'utf8'),
    readFile(`${root}/components/ui/dialog.tsx`, 'utf8'),
    readFile(`${root}/app/globals.css`, 'utf8'),
  ]);
  assert.match(button, /h-11[\s\S]*lg:h-10/);
  assert.match(dialog, /h-11 w-11[\s\S]*lg:h-10 lg:w-10/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test('core public forms and product dialog have accessible names and focus behavior', async () => {
  const [freeScan, productDialog] = await Promise.all([
    readFile(`${root}/components/marketing/free-scan-widget.tsx`, 'utf8'),
    readFile(`${root}/components/dashboard/products/add-product-modal.tsx`, 'utf8'),
  ]);
  assert.match(freeScan, /htmlFor=["']free-scan-brand["']/);
  assert.match(freeScan, /htmlFor=["']free-scan-prompt["']/);
  assert.match(freeScan, /role=["']alert["']/);
  assert.match(productDialog, /<Dialog open=\{isOpen\}/);
  assert.match(productDialog, /<DialogTitle/);
  assert.match(productDialog, /<DialogDescription/);
});

test('overview loads its supporting opportunities from the bounded dashboard summary', async () => {
  const [page, route] = await Promise.all([
    readFile(`${root}/app/(dashboard)/dashboard/page.tsx`, 'utf8'),
    readFile(`${root}/app/api/dashboard/stats/route.ts`, 'utf8'),
  ]);
  assert.match(page, /data\?\.topThreads/);
  assert.doesNotMatch(page, /api\/forum\/threads/);
  assert.match(route, /api\.dashboard\.summary/);
  assert.doesNotMatch(route, /getVisibilityMetrics|getRecentMentions|getDashboardStats/);
});

test('dashboard shell bootstraps workspace, onboarding and plan in one authenticated query', async () => {
  const [gate, sidebar, route] = await Promise.all([
    readFile(`${root}/components/onboarding-check.tsx`, 'utf8'),
    readFile(`${root}/components/dashboard/sidebar.tsx`, 'utf8'),
    readFile(`${root}/app/api/onboarding/context/route.ts`, 'utf8'),
  ]);
  assert.match(route, /getConvexDashboardBootstrap/);
  assert.match(gate, /DashboardBootstrapContext\.Provider/);
  assert.match(sidebar, /useDashboardBootstrap/);
  assert.doesNotMatch(sidebar, /fetch\(["']\/api\/(?:entitlements|onboarding\/context)/);
  assert.doesNotMatch(sidebar, /fetch\(["']\/api\/workspaces["'],\s*\{\s*cache/);
});
