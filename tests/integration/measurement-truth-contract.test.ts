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

test('marketing examples and provider status are not presented as live evidence', async () => {
  const [home, footer] = await Promise.all([
    source('app/(marketing)/page.tsx'),
    source('components/marketing/footer.tsx'),
  ]);
  assert.match(home, /Illustrative product view · example data/);
  assert.match(home, /Example data, clearly labeled/);
  assert.doesNotMatch(home, /No mock data anywhere/);
  assert.doesNotMatch(home, /Live on ChatGPT/);
  assert.doesNotMatch(footer, /All systems operational/);
});

test('dashboard visibility summaries expose sample count and Wilson confidence', async () => {
  const [dataAccess, dashboard, tracker, overview, metricCard] = await Promise.all([
    source('lib/data-access.ts'),
    source('app/(dashboard)/dashboard/page.tsx'),
    source('app/(dashboard)/dashboard/llm-tracker/page.tsx'),
    source('app/api/v1/visibility/overview/route.ts'),
    source('components/dashboard/metric-card.tsx'),
  ]);
  assert.match(dataAccess, /estimateMentionConfidence/);
  assert.match(dashboard, /llmVisibilitySamples/);
  assert.match(tracker, /mention rate/);
  assert.match(overview, /confidenceInterval/);
  assert.match(metricCard, /<button type="button"/);
});

test('all active visibility surfaces use mention rate and preserve unmeasured state', async () => {
  const [metrics, dataAccess, overview, gaps, freeScan, methodology] = await Promise.all([
    source('lib/measurement/metrics.ts'),
    source('lib/data-access.ts'),
    source('app/api/v1/visibility/overview/route.ts'),
    source('app/api/v1/prompts/gaps/route.ts'),
    source('lib/ai/llm-scanner.ts'),
    source('app/(marketing)/methodology/page.tsx'),
  ]);
  assert.match(metrics, /visibilityPercent/);
  assert.match(metrics, /estimateMentionConfidence/);
  assert.match(metrics, /minimumSamplesPerCohort = 4/);
  assert.match(dataAccess, /compareCompatibleMentionMetrics/);
  assert.doesNotMatch(dataAccess, /calculatePlatformScore/);
  assert.match(overview, /withKey\(request, 'read'/);
  assert.match(overview, /overall\.visibilityPercent/);
  assert.match(gaps, /mentionRate === null \? null/);
  assert.doesNotMatch(freeScan, /score \+= 40/);
  assert.match(methodology, /successful_samples_where_brand_named/);
});

test('provider work has deadlines and bounded engine concurrency', async () => {
  const [scanner, analyzer, service] = await Promise.all([
    source('lib/ai/llm-scanner.ts'),
    source('lib/ai/ai-analyzer.ts'),
    source('lib/measurement/service.ts'),
  ]);
  assert.match(scanner, /PROVIDER_TIMEOUT_MS/);
  assert.match(scanner, /AbortSignal\.timeout/);
  assert.match(scanner, /MAX_ENGINE_CONCURRENCY/);
  assert.match(scanner, /Promise\.all\(batch\.map/);
  assert.match(analyzer, /ANALYZER_TIMEOUT_MS/);
  assert.match(analyzer, /AbortSignal\.timeout/);
  assert.match(service, /DEFAULT_EXECUTE_TIMEOUT_MS/);
  assert.match(service, /dependencies\.persist\(sampleResults\)/);
});

test('measurement read failures stay visible and alerts run from every scan path', async () => {
  const [dataAccess, alertEngine, manualScan, scheduledScan, activationScan] = await Promise.all([
    source('lib/data-access.ts'),
    source('lib/alerts/evaluate.ts'),
    source('app/api/llm/scan/route.ts'),
    source('app/api/cron/process-scans/route.ts'),
    source('app/api/cron/process-measurement-jobs/route.ts'),
  ]);

  assert.match(dataAccess, /throw new Error\('Failed to fetch visibility metrics'/);
  assert.match(dataAccess, /throw new Error\('Failed to fetch LLM scans'/);
  assert.match(alertEngine, /ignoreDuplicates: true/);
  assert.match(alertEngine, /current\.confidence\.interval\.upper < comparison\.previous\.confidence\.interval\.lower/);
  assert.match(alertEngine, /selectPreviousAlertCohort/);
  for (const scanPath of [manualScan, scheduledScan, activationScan]) {
    assert.match(scanPath, /await evaluateMeasurementAlerts/);
  }
});

test('activation packet persists three-to-five prompt measurements and one ranked action', async () => {
  const [route, packet, onboarding, migration] = await Promise.all([
    source('app/api/onboarding/decision-packet/route.ts'),
    source('lib/measurement/decision-packet.ts'),
    source('app/(dashboard)/onboarding/page.tsx'),
    source('supabase/migrations/029_create_decision_packets.sql'),
  ]);
  assert.match(route, /prompts\.length < 3 \|\| prompts\.length > 5/);
  assert.match(route, /samples: 4/);
  assert.match(route, /reserveScanQuota/);
  assert.match(route, /decision_packets/);
  assert.match(packet, /provider_citation/);
  assert.match(packet, /rankedAction/);
  assert.match(onboarding, /Open sample receipt/);
  assert.match(onboarding, /Provider-backed source gaps/);
  assert.match(onboarding, /throw new Error\(data\?\.error \|\| `Could not finish onboarding/);
  assert.doesNotMatch(onboarding, /finally \{[\s\S]{0,200}router\.push\('\/dashboard'\)/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.doesNotMatch(migration, /FOR (INSERT|UPDATE|DELETE)\s+TO authenticated/i);
});
