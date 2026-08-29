import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('the scanner uses exact brand matching and structured citation provenance', async () => {
  const [analyzer, scanner] = await Promise.all([
    source('lib/ai/ai-analyzer.ts'),
    source('lib/ai/llm-scanner.ts'),
  ]);

  assert.match(analyzer, /matchesBrand/);
  assert.doesNotMatch(analyzer, /Missing character/);
  assert.doesNotMatch(analyzer, /\.slice\(0, i\) \+ common\.slice/);
  assert.match(scanner, /extractPerplexityCitationReferences/);
  assert.match(scanner, /extractGeminiCitationReferences/);
  assert.match(scanner, /collectCitationEvidence/);
  assert.doesNotMatch(scanner, /domain\.includes\(brandDomain\)/);
});

test('source aggregates require provider evidence and receipts expose labels', async () => {
  const [sourcesRoute, citationsRoute, receipt, tracker, publicReceipt] = await Promise.all([
    source('app/api/v1/citations/sources/route.ts'),
    source('app/api/v1/citations/route.ts'),
    source('components/dashboard/scan-receipt-drawer.tsx'),
    source('app/(dashboard)/dashboard/llm-tracker/page.tsx'),
    source('app/(marketing)/scan/[id]/page.tsx'),
  ]);

  assert.match(sourcesRoute, /provenance !== 'provider_citation'/);
  assert.match(citationsRoute, /provenance:/);
  for (const display of [receipt, tracker, publicReceipt]) {
    assert.match(display, /Provider citation/);
    assert.match(display, /Link mentioned/);
    assert.match(display, /Unverified/);
  }
});

test('intervention receipts use multi-sample matched cohorts and allow inconclusive verdicts', async () => {
  const [measureRoute, comparison, snapshot, page] = await Promise.all([
    source('app/api/interventions/[id]/measure/route.ts'),
    source('lib/measurement/comparison.ts'),
    source('lib/interventions.ts'),
    source('app/(dashboard)/dashboard/interventions/page.tsx'),
  ]);

  assert.match(measureRoute, /runVisibilityMeasurement/);
  assert.match(measureRoute, /samples: 4/);
  assert.match(measureRoute, /reserveScanQuota/);
  assert.doesNotMatch(measureRoute, /scanLLM\(/);
  assert.match(comparison, /followupConfidence\.interval\.lower > baselineConfidence\.interval\.upper/);
  assert.match(comparison, /'inconclusive'/);
  assert.match(snapshot, /SNAPSHOT_SAMPLES_PER_ENGINE = 8/);
  assert.match(page, /"inconclusive"/);
});
