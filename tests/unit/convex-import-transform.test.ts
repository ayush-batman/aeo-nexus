import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPORT_TABLES,
  assertExportTargetAllowed,
  transformExportRow,
} from '../../scripts/convex/migration-transform';

test('migration exports parents before children and includes every source table', () => {
  assert.deepEqual(EXPORT_TABLES.slice(0, 3), ['organizations', 'users', 'workspaces']);
  for (const table of [
    'llm_scans',
    'interventions',
    'api_keys',
    'billing_webhook_events',
  ] as const) {
    assert.ok(EXPORT_TABLES.includes(table), `${table} must be exported`);
  }
  assert.equal(new Set(EXPORT_TABLES).size, EXPORT_TABLES.length);
});

test('production-looking Supabase targets require an explicit export flag', () => {
  assert.throws(
    () => assertExportTargetAllowed('postgres://user@db.supabase.co:5432/postgres', false),
    /production_export_requires_explicit_flag/,
  );
  assert.doesNotThrow(() =>
    assertExportTargetAllowed('postgres://user@127.0.0.1:54322/postgres', false),
  );
  assert.doesNotThrow(() =>
    assertExportTargetAllowed('postgres://user@db.supabase.co:5432/postgres', true),
  );
});

test('export rows retain public IDs and convert timestamps without changing evidence', () => {
  const transformed = transformExportRow('llm_scans', {
    id: '11111111-1111-4111-8111-111111111111',
    workspace_id: '22222222-2222-4222-8222-222222222222',
    brand_mentioned: true,
    citations: [{ url: 'https://example.com/source', provenance: 'provider_citation' }],
    created_at: '2026-08-30T00:00:00.000Z',
  });

  assert.equal(transformed.publicId, '11111111-1111-4111-8111-111111111111');
  assert.equal(transformed.workspacePublicId, '22222222-2222-4222-8222-222222222222');
  assert.equal(transformed.brandMentioned, true);
  assert.equal(transformed.createdAt, Date.parse('2026-08-30T00:00:00.000Z'));
  assert.deepEqual(transformed.citations, [
    { url: 'https://example.com/source', provenance: 'provider_citation' },
  ]);
});
