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

test('the primary Sources job ranks domains from provider-backed citations', async () => {
  const [route, page, sourceMap, sidebar] = await Promise.all([
    source('app/api/analytics/citations/route.ts'),
    source('app/(dashboard)/dashboard/sources/page.tsx'),
    source('components/dashboard/analytics/citation-map.tsx'),
    source('components/dashboard/sidebar.tsx'),
  ]);

  assert.match(route, /provenance !== 'provider_citation'/);
  assert.match(route, /domains: Array\.from\(domainMap/);
  assert.match(route, /isOwnDomain/);
  assert.match(sourceMap, /Exact URLs|exact URLs|source\.urls/);
  assert.match(sourceMap, /Links found only in answer prose are not counted/);
  assert.match(page, /Provider-backed domains/);
  assert.match(sidebar, /href: "\/dashboard\/sources"/);
});

test('intervention receipts use multi-sample matched cohorts and allow inconclusive verdicts', async () => {
const [backend, comparison, snapshot] = await Promise.all([source('convex/actionMeasurements.ts'),source('lib/measurement/comparison.ts'),source('lib/interventions.ts')]);
 assert.match(backend,/beginMeasurement/); assert.match(backend,/samples: 4/);
 assert.match(backend,/compareVisibilitySnapshots/);
 assert.match(comparison,/followupConfidence\.interval\.lower > baselineConfidence\.interval\.upper/);
 assert.match(comparison,/'inconclusive'/);
 assert.match(snapshot,/rows\.length < 8/);
 assert.match(snapshot,/snapshotFromObservations/);
});

test('marketing examples and provider status are not presented as live evidence', async () => {
  const [home, evidenceSequence, footer] = await Promise.all([
    source('app/(marketing)/page.tsx'),
    source('components/marketing/evidence-sequence.tsx'),
    source('components/marketing/footer.tsx'),
  ]);
  assert.match(evidenceSequence, /Illustrative answer/);
  assert.match(evidenceSequence, /Illustrative structure, not a customer result/);
  assert.match(evidenceSequence, /A live receipt only shows answers and evidence returned by the provider/);
  assert.doesNotMatch(home, /No mock data anywhere/);
  assert.doesNotMatch(home, /Live on ChatGPT/);
  assert.doesNotMatch(footer, /All systems operational/);
});

test('marketing evidence motion stays controllable and respects reduced-motion preferences', async () => {
  const sequence = await source('components/marketing/evidence-sequence.tsx');

  assert.match(sequence, /aria-pressed=\{activeIndex === index\}/);
  assert.match(sequence, /Pause sample sequence/);
  assert.match(sequence, /Play sample sequence/);
  assert.match(sequence, /prefers-reduced-motion: reduce/);
  assert.match(sequence, /setIsPlaying\(false\)/);
});

test('dashboard visibility summaries expose exact counts and Wilson confidence', async () => {
  const [dataAccess, dashboard, tracker, overview, metricCard, navigation] = await Promise.all([
    source('lib/data-access.ts'),
    source('app/(dashboard)/dashboard/page.tsx'),
    source('app/(dashboard)/dashboard/llm-tracker/page.tsx'),
    source('app/api/v1/visibility/overview/route.ts'),
    source('components/dashboard/metric-card.tsx'),
    source('components/dashboard/dashboard-navigation.tsx'),
  ]);
  assert.match(dataAccess, /estimateMentionConfidence/);
  assert.match(dataAccess, /llmVisibilityMentions/);
  assert.match(dashboard, /llmVisibilitySamples/);
  assert.match(dashboard, /llmVisibilityMentions/);
  assert.match(tracker, /mention rate/);
  assert.match(overview, /confidenceInterval/);
  assert.match(metricCard, /<button type="button"/);
  for (const job of ['Overview', 'Prompts & Scans', 'Sources', 'Actions', 'Reports & Settings']) {
    assert.match(navigation, new RegExp(job.replace('&', '&')));
  }
  assert.match(navigation, /aelo-dashboard-theme-v1/);
  assert.doesNotMatch(navigation, /dataset\.theme = "dark"/);
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
  assert.match(methodology, /mentions ÷ successful samples × 100/);
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
  assert.match(scanner, /search_context_size: 'low'/);
  assert.match(scanner, /reasoning: \{ effort: 'low'/);
  assert.match(scanner, /max_output_tokens: 2000/);
  assert.match(analyzer, /ANALYZER_TIMEOUT_MS/);
  assert.match(analyzer, /AbortSignal\.timeout/);
  assert.match(service, /DEFAULT_EXECUTE_TIMEOUT_MS/);
  assert.match(service, /dependencies\.persist\(sampleResults\)/);
});

test('measurement read failures stay visible and alerts run from every scan path', async () => {
const [data, alerts, backend, worker] = await Promise.all([source('lib/data-access.ts'),source('lib/alerts/evaluate.ts'),source('convex/measurements.ts'),source('convex/measurementAlerts.ts')]);
 assert.match(data,/readScanPages/);
 assert.doesNotMatch(data,/catch[\s\S]{0,100}return \[\]/);
 assert.match(alerts,/current\.confidence\.interval\.upper < comparison\.previous\.confidence\.interval\.lower/);
 assert.match(backend,/internal\.measurementAlerts\.evaluate/);
 assert.match(worker,/by_workspace_id_and_dedupe_key/);
 assert.match(worker,/if \(existing\) return false/);
 for(const path of ['convex/apiWrites.ts','convex/scheduled.ts','convex/activation.ts']) assert.match(await source(path),/beginMeasurement/);
});

test('activation packet persists three-to-five prompt measurements and one ranked action', async () => {
const [backend, packet, page] = await Promise.all([source('convex/activation.ts'),source('lib/measurement/decision-packet.ts'),source('app/(dashboard)/onboarding/page.tsx')]);
 assert.match(backend,/prompts\.length < 3 \|\| prompts\.length > 5/);
 assert.match(backend,/samples: 4/); assert.match(backend,/beginMeasurement/);
 assert.match(backend,/ctx\.db\.insert\('decisionPackets'/); assert.match(backend,/measurementRunIds: runIds/);
 assert.match(packet,/provider_citation/); assert.match(packet,/rankedAction/);
 assert.match(page,/Open sample receipt/); assert.match(page,/Provider-backed source gaps/);
 assert.doesNotMatch(page,/console\.error\('Decision packet failed/);
 assert.doesNotMatch(page,/finally \{[\s\S]{0,200}router\.push\('\/dashboard'\)/);
});
