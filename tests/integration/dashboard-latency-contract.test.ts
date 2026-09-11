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
