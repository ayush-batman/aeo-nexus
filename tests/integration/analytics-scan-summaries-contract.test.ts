import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('analytics uses complete, tenant-bound summaries without changing full scan receipts', async () => {
  const [route, page, records, fullScans] = await Promise.all([
    readFile(new URL('../../app/api/analytics/scan-summaries/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/(dashboard)/dashboard/analytics/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../convex/records.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/llm/scans/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(route, /getCurrentWorkspaceId/);
  assert.match(route, /api\.records\.analyticsScans/);
  assert.match(page, /loadScanSummaries/);
  assert.match(page, /\/api\/analytics\/scan-summaries/);
  assert.doesNotMatch(page, /\/api\/llm\/scans\?limit=200/);
  assert.match(records, /export const analyticsScans = tenantQuery/);
  assert.match(records, /by_workspace_id_and_created_at/);
  assert.match(fullScans, /getLLMScans/);
});
