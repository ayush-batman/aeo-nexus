import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import pg from 'pg';
import { exportTable, exportTableFromRest } from '../../scripts/convex/export-supabase';

test('a missing optional table does not abort the export and files stay private', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'aelo-export-test-'));
  const client = new pg.Client();
  const queries: string[] = [];
  t.mock.method(client, 'query', async (sql: string, args: unknown[]) => {
    queries.push(sql);
    if (sql.startsWith('SELECT to_regclass')) return { rows: [{ relation: args[0] === 'public.experiments' ? null : args[0] }] };
    if (sql.includes('"experiments"')) throw new Error('missing_table_aborts_transaction');
    return { rows: [{ id: 'org', name: 'Synthetic', plan: 'free', created_at: new Date('2026-08-30T00:00:00Z') }] };
  });
  try {
    const missing = await exportTable(client, 'experiments', directory);
    assert.deepEqual(missing, { count: 0, missing: true, sha256: createHash('sha256').update('').digest('hex') });
    const present = await exportTable(client, 'organizations', directory);
    assert.equal(present.count, 1);
    assert.equal(present.missing, false);
    const path = join(directory, 'organizations.jsonl');
    const bytes = await readFile(path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), present.sha256);
    assert.equal(JSON.parse(bytes.toString()).createdAt, Date.parse('2026-08-30T00:00:00Z'));
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    assert.equal(queries.some((sql) => sql.includes('"experiments"')), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('REST export pages by public id, transforms rows, and keeps files private', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aelo-rest-export-test-'));
  const first = Array.from({ length: 1_000 }, (_, index) => ({
    id: `org-${String(index).padStart(4, '0')}`,
    name: `Organization ${index}`,
    plan: 'free',
    created_at: '2026-09-01T00:00:00.000Z',
  }));
  const urls: string[] = [];
  try {
    const manifest = await exportTableFromRest({
      baseUrl: 'https://project.supabase.co', serviceRoleKey: 'test-only',
      fetch: async (url) => {
        urls.push(url);
        return { ok: true, status: 200, json: async () => urls.length === 1
          ? first : [{ id: 'org-1000', name: 'Final', plan: 'free', created_at: '2026-09-02T00:00:00.000Z' }] };
      },
    }, 'organizations', directory);
    assert.equal(manifest.count, 1_001);
    assert.equal(manifest.missing, false);
    assert.match(urls[1], /id=gt\.org-0999/);
    const path = join(directory, 'organizations.jsonl');
    const bytes = await readFile(path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
    assert.equal(JSON.parse(bytes.toString().split('\n')[0]).createdAt, Date.parse('2026-09-01T00:00:00.000Z'));
    assert.equal((await stat(path)).mode & 0o777, 0o600);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('REST export accepts only the explicit missing-table response', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aelo-rest-missing-test-'));
  try {
    const missing = await exportTableFromRest({
      baseUrl: 'https://project.supabase.co', serviceRoleKey: 'test-only',
      fetch: async () => ({ ok: false, status: 404, json: async () => ({ code: 'PGRST205' }) }),
    }, 'experiments', directory);
    assert.equal(missing.missing, true);
    await assert.rejects(() => exportTableFromRest({
      baseUrl: 'https://project.supabase.co', serviceRoleKey: 'test-only',
      fetch: async () => ({ ok: false, status: 403, json: async () => ({ code: '42501' }) }),
    }, 'users', directory), /supabase_rest_export_failed:users:403:42501/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
