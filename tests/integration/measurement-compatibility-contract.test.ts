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
    readFile(`${root}/app/api/dashboard/decision-inbox/route.ts`, 'utf8'),
    readFile(`${root}/app/api/cron/weekly-digest/route.ts`, 'utf8'),
    readFile(`${root}/lib/weekly-inbox.ts`, 'utf8'),
  ]);
  for (const source of [route, digest]) {
    assert.match(source, /provider_model/);
    assert.match(source, /scorer_version/);
    assert.match(source, /measurement_contract_version/);
  }
  assert.match(inbox, /compatibility\.some/);
});

test('weekly sentiment compares only version-matched cohorts with four samples', async () => {
  const [analytics, cron, migration] = await Promise.all([
    readFile(`${root}/lib/analytics/sentiment-drift.ts`, 'utf8'),
    readFile(`${root}/app/api/cron/sentiment-drift/route.ts`, 'utf8'),
    readFile(`${root}/supabase/migrations/20260830050821_version_sentiment_drift_snapshots.sql`, 'utf8'),
  ]);
  for (const field of ['provider_model', 'measurement_region', 'measurement_mode', 'scorer_version', 'measurement_contract_version']) {
    assert.match(analytics, new RegExp(field));
    assert.match(migration, new RegExp(field));
  }
  assert.match(analytics, /MIN_SAMPLE_SIZE = 4/);
  assert.match(cron, /ignoreDuplicates: true/);
  assert.match(cron, /dedupe_key/);
  assert.match(migration, /REVOKE INSERT, UPDATE, DELETE[\s\S]*authenticated/i);
});
