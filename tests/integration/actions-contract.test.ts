import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = process.cwd();

test('actions migration is additive, org-scoped, audited, and idempotent', async () => {
  const sql = await readFile(`${root}/supabase/migrations/030_persist_team_actions.sql`, 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS owner_id/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS hypothesis/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS (?:public\.)?action_events/i);
  assert.match(sql, /CREATE UNIQUE INDEX[\s\S]*workspace_id, insight_key/i);
  assert.match(sql, /FOR SELECT/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /FOR ALL[\s\S]*WITH CHECK\s*\(true\)/i);
});

test('legacy Insights is a server redirect to persisted Actions', async () => {
  const page = await readFile(`${root}/app/(dashboard)/dashboard/insights/page.tsx`, 'utf8');
  assert.match(page, /redirect\(['"]\/dashboard\/interventions['"]\)/);
  assert.doesNotMatch(page, /InsightsBoard|localStorage/);
});

test('action mutations bind rows to the authenticated workspace and validate roles', async () => {
const backend = await readFile(new URL('../../convex/actions.ts', import.meta.url), 'utf8');
  assert.match(backend, /requireRole\(ctx\.tenant, 'editor'\)/);
  assert.match(backend, /requireWorkspace\(ctx, ctx\.tenant, args\.workspaceId\)/);
  assert.match(backend, /existing\.workspaceId !== workspace\._id/);
  assert.match(backend, /canTransitionAction/);
  assert.match(backend, /normalizeActionInput/);
});

test('action measurement retries reuse quota and audit idempotency keys', async () => {
const [route, backend, snapshots] = await Promise.all([
    readFile(new URL('../../app/api/interventions/[id]/measure/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../convex/actionMeasurements.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../lib/interventions.ts', import.meta.url), 'utf8')]);
  assert.match(route, /request\.headers\.get\('idempotency-key'\)/);
  assert.match(backend, /requireRole\(ctx\.tenant, 'editor'\)/);
  assert.match(backend, /by_action_request/);
  assert.match(backend, /if \(duplicate\) return duplicate\.publicId/);
  assert.match(backend, /samples: 4/);
  assert.match(backend, /beginMeasurement/);
  assert.match(backend, /idempotencyKey: .measured:/);
  for (const field of ['provider_model','measurement_region','measurement_mode','scorer_version','measurement_contract_version','search_mode','analyzer_method','analyzer_model','analyzer_prompt_version']) assert.ok(snapshots.includes(field));
});

test('action rows and audit events mutate in one service-role database transaction', async () => {
const [actions, measurements] = await Promise.all([
    readFile(new URL('../../convex/actions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../convex/actionMeasurements.ts', import.meta.url), 'utf8')]);
  assert.match(actions, /export const save = tenantMutation/);
  assert.match(actions, /ctx\.db\.(?:replace|insert)/);
  assert.match(actions, /ctx\.db\.insert\('actionEvents'/);
  assert.match(measurements, /export const finish = internalMutation/);
  assert.match(measurements, /ctx\.db\.patch\(action\._id/);
  assert.match(measurements, /ctx\.db\.insert\('actionEvents'/);
  assert.match(measurements, /job\.status !== 'running'/);
});
