import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = process.cwd();

test('scan receipts persist model, region, mode, scorer, run, and contract metadata', async () => {
  const [migration, persistence, service] = await Promise.all([
    readFile(`${root}/supabase/migrations/032_add_measurement_compatibility_metadata.sql`, 'utf8'),
    readFile(`${root}/lib/measurement/persistence.ts`, 'utf8'),
    readFile(`${root}/lib/measurement/service.ts`, 'utf8'),
  ]);
  for (const column of ['measurement_run_id', 'measurement_contract_version', 'sample_number', 'provider_model', 'measurement_region', 'measurement_mode', 'scorer_version']) {
    assert.match(migration, new RegExp(column));
    assert.match(persistence, new RegExp(column));
  }
  assert.match(service, /result\.measurementRunId = runId/);
  assert.match(service, /MEASUREMENT_SCORER_VERSION/);
});

test('weekly decisions select compatibility metadata before comparing cohorts', async () => {
const [route, digest, inbox] = await Promise.all([
  readFile(new URL('../../app/api/dashboard/decision-inbox/route.ts', import.meta.url),'utf8'),
  readFile(new URL('../../convex/weekly.ts', import.meta.url),'utf8'),
  readFile(new URL('../../lib/weekly-inbox.ts', import.meta.url),'utf8')]);
 assert.match(route,/readScanPages/);
 for(const field of ['provider_model','scorer_version','measurement_contract_version','search_mode','analyzer_method','analyzer_model','analyzer_prompt_version']) assert.ok(digest.includes(field));
 assert.match(inbox,/compatibility\.some/);
});

test('weekly sentiment compares only version-matched cohorts with four samples', async () => {
const [model, worker, store] = await Promise.all([
  readFile(new URL('../../lib/analytics/sentiment-model.ts', import.meta.url),'utf8'),
  readFile(new URL('../../convex/weeklyActions.ts', import.meta.url),'utf8'),
  readFile(new URL('../../convex/drift.ts', import.meta.url),'utf8')]);
 for(const field of ['provider_model','measurement_region','measurement_mode','scorer_version','measurement_contract_version','search_mode','analyzer_method','analyzer_model','analyzer_prompt_version']) assert.ok(model.includes(field));
 assert.match(model,/MIN_SAMPLE_SIZE\s*=\s*4/);
 assert.match(model,/compareDrift/);
 assert.match(worker,/cohort_key/);
 assert.match(worker,/dedupeKey:key/);
 assert.match(store,/by_workspace_cohort_week/);
});
