/// <reference types="vite/client" />
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getFunctionName, makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import schema from '../../convex/schema';
import { internal } from '../../convex/_generated/api';
import { EXPORT_TABLES } from '../../scripts/convex/migration-transform';
import { assertImportTargetAllowed, importExport, readManifest, type ImportCaller } from '../../scripts/convex/import-convex';

const modules = import.meta.glob('../../convex/**/*.ts');
const now = 1_788_048_000_000;

async function fixture(directory: string) {
  const payloads: Record<string, Record<string, unknown>> = {
    organizations: { publicId: 'org', name: 'Synthetic', plan: 'free', createdAt: now, updatedAt: now },
    users: { publicId: 'owner', organizationPublicId: 'org', email: 'synthetic@example.com', role: 'owner', createdAt: now },
    workspaces: { publicId: 'workspace', organizationPublicId: 'org', name: 'Brand', createdAt: now, updatedAt: now },
    prompt_library: { publicId: 'prompt', workspacePublicId: 'workspace', prompt: 'Buyer question', createdAt: now },
  };
  const tables: Record<string, { count: number; sha256: string; missing: boolean }> = {};
  for (const table of EXPORT_TABLES) {
    const line = payloads[table] ? `${JSON.stringify(payloads[table])}\n` : '';
    await writeFile(join(directory, `${table}.jsonl`), line, { mode: 0o600 });
    tables[table] = { count: payloads[table] ? 1 : 0,
      sha256: createHash('sha256').update(line).digest('hex'), missing: false };
  }
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({
    version: 'aelo-convex-export.v1', sourceFingerprint: 'f'.repeat(64), tables,
  }));
}

test('verified export imports, resumes, and replays without overwriting a completed snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aelo-import-test-'));
  try {
    await fixture(directory);
    const t = convexTest(schema, modules);
    let failOnce = true;
    const call: ImportCaller = async (kind, fn, args) => {
      const name = getFunctionName(fn);
      if (name === 'imports:materializeRemainingBatch' && failOnce) {
        failOnce = false;
        throw new Error('synthetic_connection_interruption');
      }
      return kind === 'query'
        ? t.query(makeFunctionReference<'query'>(name), args)
        : t.mutation(makeFunctionReference<'mutation'>(name), args);
    };
    await expect(importExport(directory, call)).rejects.toThrow('synthetic_connection_interruption');
    const counts = await importExport(directory, call);
    expect(counts.prompt_library).toBe(1);
    expect(counts.users).toBe(1);
    await t.run(async (ctx) => {
      const user = (await ctx.db.query('users').take(1))[0];
      await ctx.db.patch(user._id, { authSubject: 'claimed-auth-subject', emailVerified: true, claimedAt: now });
    });
    expect(await importExport(directory, call)).toEqual(counts);
    await t.run(async (ctx) => {
      expect(await ctx.db.query('importStaging').take(10)).toHaveLength(4);
      expect(await ctx.db.query('memberships').take(10)).toHaveLength(1);
      expect((await ctx.db.query('users').take(1))[0].emailVerified).toBe(true);
      expect((await ctx.db.query('importRuns').take(1))[0].status).toBe('complete');
    });
    // Parity must detect changed target data even when the run previously passed.
    await t.run(async (ctx) => {
      const org = (await ctx.db.query('organizations').take(1))[0];
      await ctx.db.patch(org._id, { plan: 'pro' });
    });
    await expect(importExport(directory, call)).rejects.toThrow('import_parity_failed:organizations');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('tampered source files are rejected before making any backend call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aelo-import-test-'));
  try {
    await fixture(directory);
    const file = join(directory, 'prompt_library.jsonl');
    await writeFile(file, (await readFile(file, 'utf8')).replace('Buyer question', 'Changed question'));
    let called = false;
    const call: ImportCaller = async () => { called = true; throw new Error('must_not_call'); };
    await expect(importExport(directory, call)).rejects.toThrow('export_hash_mismatch:prompt_library');
    expect(called).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('staging rejects changed payloads and an unverified completion count', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aelo-import-test-'));
  try {
    await fixture(directory);
    const { manifest, manifestHash } = await readManifest(directory);
    const t = convexTest(schema, modules);
    await t.mutation(internal.importControl.begin, { manifestHash, sourceLabel: 'synthetic',
      expectedCounts: Object.fromEntries(EXPORT_TABLES.map((table) => [table, manifest.tables[table].count])) });
    const payload = { publicId: 'prompt', prompt: 'Original', workspacePublicId: 'workspace' };
    await t.mutation(internal.importControl.stage, { manifestHash, sourceTable: 'prompt_library', rows: [{ publicId: 'prompt', payload }] });
    await expect(t.mutation(internal.importControl.stage, { manifestHash, sourceTable: 'prompt_library',
      rows: [{ publicId: 'prompt', payload: { ...payload, prompt: 'Changed' } }] })).rejects.toThrow('staged_payload_changed');
    await expect(t.mutation(internal.importControl.complete, { manifestHash, verifiedCounts: {} })).rejects.toThrow('unverified_import_counts');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('remote writes require the exact target and credentials cannot travel in URLs', () => {
  expect(() => assertImportTargetAllowed('https://example.convex.cloud')).toThrow('remote_import_requires_exact_target_confirmation');
  expect(() => assertImportTargetAllowed('https://example.convex.cloud', 'https://other.convex.cloud')).toThrow();
  expect(() => assertImportTargetAllowed('https://example.convex.cloud', 'https://example.convex.cloud')).not.toThrow();
  expect(() => assertImportTargetAllowed('https://example.convex.site', 'https://example.convex.site')).toThrow('convex_import_requires_cloud_url');
  expect(() => assertImportTargetAllowed('http://localhost:3210')).not.toThrow();
  expect(() => assertImportTargetAllowed('http://user:secret@localhost:3210')).toThrow('invalid_convex_import_url');
});
