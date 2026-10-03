import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import pg from 'pg';

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

test('export accepts actual pg date and numeric parser outputs', () => {
  const timestamp = pg.types.getTypeParser(1184)('2026-08-30 00:00:00+00');
  const day = pg.types.getTypeParser(1082)('2026-08-30');
  const numeric = pg.types.getTypeParser(1700)('0.875');
  const transformed = transformExportRow('sentiment_drift_snapshots', {
    id: 'snapshot', created_at: timestamp, week_start: day, avg_sentiment: numeric,
  });
  assert.equal(transformed.createdAt, Date.parse('2026-08-30T00:00:00Z'));
  assert.equal(transformed.weekStart, '2026-08-30');
  assert.equal(transformed.avgSentiment, 0.875);
  assert.throws(() => transformExportRow('llm_scans', { confidence: 'NaN' }), /invalid_numeric/);
  assert.throws(() => transformExportRow('llm_scans', { created_at: new Date('invalid') }), /invalid_timestamp/);
});

test('newsletter export hashes unsubscribe tokens while preserving existing links', () => {
  const token = 'synthetic-unsubscribe-token';
  const transformed = transformExportRow('newsletter_subscribers', { id: 'subscriber', unsubscribe_token: token });
  assert.equal(transformed.unsubscribeTokenHash, createHash('sha256').update(token).digest('hex'));
  assert.equal('unsubscribeToken' in transformed, false);
  assert.equal(JSON.stringify(transformed).includes(token), false);
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
