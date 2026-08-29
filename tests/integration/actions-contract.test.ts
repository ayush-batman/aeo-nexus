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
  const collection = await readFile(`${root}/app/api/interventions/route.ts`, 'utf8');
  const member = await readFile(`${root}/app/api/interventions/[id]/route.ts`, 'utf8');
  assert.match(collection, /requireWorkspaceRole/);
  assert.match(collection, /workspace_id:\s*context\.workspaceId/);
  assert.match(collection, /insight_key/);
  assert.match(member, /\.eq\(['"]workspace_id['"],\s*context\.workspaceId\)/);
  assert.match(member, /update_action_with_event/);
  assert.match(member, /canTransitionAction/);
});

test('action measurement retries reuse quota and audit idempotency keys', async () => {
  const route = await readFile(`${root}/app/api/interventions/[id]/measure/route.ts`, 'utf8');
  assert.match(route, /requireWorkspaceRole/);
  assert.match(route, /Viewer role cannot measure actions/);
  assert.match(route, /request\.headers\.get\(['"]idempotency-key['"]\)/);
  assert.match(route, /reservation === ['"]duplicate['"]/);
  assert.match(route, /p_event_type:\s*['"]measured['"]/);
  assert.match(route, /update_action_with_event/);
  assert.match(route, /measured:\$\{requestKey\}/);
  for (const field of ['provider_model', 'measurement_region', 'measurement_mode', 'scorer_version', 'contract_version']) {
    assert.match(route, new RegExp(field));
  }
  assert.match(route, /engine\.providerModels\.length === 1/);
});

test('action rows and audit events mutate in one service-role database transaction', async () => {
  const [sql, collection, member, measure] = await Promise.all([
    readFile(`${root}/supabase/migrations/034_atomic_actions_and_workspace_limits.sql`, 'utf8'),
    readFile(`${root}/app/api/interventions/route.ts`, 'utf8'),
    readFile(`${root}/app/api/interventions/[id]/route.ts`, 'utf8'),
    readFile(`${root}/app/api/interventions/[id]/measure/route.ts`, 'utf8'),
  ]);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.create_action_with_event/i);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.update_action_with_event/i);
  assert.match(sql, /INSERT INTO public\.action_events/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.create_action_with_event/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_action_with_event[\s\S]*TO service_role/i);
  for (const route of [collection, member, measure]) {
    assert.match(route, /\.rpc\(['"](?:create|update)_action_with_event['"]/);
  }
  assert.doesNotMatch(member, /\.from\(['"]action_events['"]\)\.upsert/);
  assert.doesNotMatch(measure, /\.from\(['"]action_events['"]\)\.upsert/);
});
