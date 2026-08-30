import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Convex registers every required backend component', async () => {
  const source = await readFile('convex/convex.config.ts', 'utf8');

  for (const component of [
    '@convex-dev/better-auth/convex.config.js',
    '@convex-dev/rate-limiter/convex.config.js',
    '@convex-dev/workflow/convex.config.js',
    '@convex-dev/workpool/convex.config.js',
  ]) {
    assert.match(source, new RegExp(component.replaceAll('.', '\\.')));
  }
});

test('externally addressable tables have public ID indexes', async () => {
  const source = await readFile('convex/schema.ts', 'utf8');

  for (const table of [
    'organizations',
    'users',
    'workspaces',
    'products',
    'scans',
    'actions',
    'publicScans',
    'apiKeys',
  ]) {
    assert.match(
      source,
      new RegExp(`${table}:[\\s\\S]*?by_public_id`),
      `${table} needs a by_public_id index`,
    );
  }
});

test('security and idempotency lookup indexes remain declared', async () => {
  const source = await readFile('convex/schema.ts', 'utf8');

  for (const index of [
    'by_organization_id_and_user_id',
    'by_workspace_id_and_created_at',
    'by_provider_and_event_id',
    'by_key_hash',
    'by_workspace_id_and_insight_key',
    'by_workspace_id_and_measurement_run_id',
  ]) {
    assert.match(source, new RegExp(`index\\('${index}'`), `${index} is required`);
  }
});

