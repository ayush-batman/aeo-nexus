import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { addImportMetrics, canonicalJson, importTableTargets, isImportSource } from './lib/importParity';

const countsValidator = v.record(v.string(), v.number());
const hashPattern = /^[a-f0-9]{64}$/;

export const begin = internalMutation({
  args: { manifestHash: v.string(), sourceLabel: v.string(), expectedCounts: countsValidator },
  returns: v.object({ complete: v.boolean() }),
  handler: async (ctx, args) => {
    if (!hashPattern.test(args.manifestHash)) throw new Error('invalid_manifest_hash');
    for (const [table, count] of Object.entries(args.expectedCounts)) {
      if (!isImportSource(table) || !Number.isSafeInteger(count) || count < 0) throw new Error('invalid_import_counts');
    }
    if (Object.keys(args.expectedCounts).length !== Object.keys(importTableTargets).length) {
      throw new Error('incomplete_import_manifest');
    }
    const existing = await ctx.db.query('importRuns')
      .withIndex('by_manifest_hash', (q) => q.eq('manifestHash', args.manifestHash)).unique();
    if (existing) {
      if (canonicalJson(existing.counts) !== canonicalJson(args.expectedCounts)) throw new Error('manifest_counts_changed');
      // Replaying a finished snapshot is read-only: the client still verifies parity.
      return { complete: existing.status === 'complete' };
    }
    await ctx.db.insert('importRuns', {
      publicId: args.manifestHash, manifestHash: args.manifestHash, status: 'running',
      sourceLabel: args.sourceLabel, counts: args.expectedCounts, lastError: null,
      startedAt: Date.now(), completedAt: null,
    });
    return { complete: false };
  },
});

export const stage = internalMutation({
  args: {
    manifestHash: v.string(), sourceTable: v.string(),
    rows: v.array(v.object({ publicId: v.string(), payload: v.any() })),
  },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, args) => {
    if (!isImportSource(args.sourceTable)) throw new Error('unknown_import_table');
    if (args.rows.length > 200 || JSON.stringify(args.rows).length > 1_000_000) throw new Error('import_batch_too_large');
    const run = await ctx.db.query('importRuns')
      .withIndex('by_manifest_hash', (q) => q.eq('manifestHash', args.manifestHash)).unique();
    if (!run) throw new Error('import_run_not_started');
    let inserted = 0;
    for (const row of args.rows) {
      if (!row.publicId || !row.payload || Array.isArray(row.payload) || typeof row.payload !== 'object' || row.payload.publicId !== row.publicId) {
        throw new Error('staging_public_id_mismatch');
      }
      if (new TextEncoder().encode(JSON.stringify(row.payload)).byteLength > 500_000) {
        throw new Error('import_record_too_large');
      }
      const existing = await ctx.db.query('importStaging')
        .withIndex('by_manifest_table_public_id', (q) => q.eq('manifestHash', args.manifestHash)
          .eq('sourceTable', args.sourceTable).eq('sourcePublicId', row.publicId)).unique();
      if (existing) {
        if (canonicalJson(existing.payload) !== canonicalJson(row.payload)) throw new Error('staged_payload_changed');
      } else {
        if (run.status !== 'running') throw new Error('import_run_closed');
        await ctx.db.insert('importStaging', { manifestHash: args.manifestHash,
          sourceTable: args.sourceTable, sourcePublicId: row.publicId, payload: row.payload });
        inserted++;
      }
    }
    return { inserted };
  },
});

// Only the administrator's import runner calls this after verifying every page.
// Application clients cannot invoke internal functions or mark a run complete.
export const complete = internalMutation({
  args: { manifestHash: v.string(), verifiedCounts: countsValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.query('importRuns')
      .withIndex('by_manifest_hash', (q) => q.eq('manifestHash', args.manifestHash)).unique();
    if (!run || canonicalJson(run.counts) !== canonicalJson(args.verifiedCounts)) throw new Error('unverified_import_counts');
    if (run.status !== 'complete') await ctx.db.patch(run._id, { status: 'complete', completedAt: Date.now() });
    return null;
  },
});

export const parityPage = internalQuery({
  args: { manifestHash: v.string(), sourceTable: v.string(), afterPublicId: v.union(v.string(), v.null()) },
  returns: v.object({ expected: countsValidator, actual: countsValidator, missing: v.number(),
    mismatched: v.number(), nextPublicId: v.union(v.string(), v.null()), complete: v.boolean() }),
  handler: async (ctx, args) => {
    if (!isImportSource(args.sourceTable)) throw new Error('unknown_import_table');
    const table = importTableTargets[args.sourceTable];
    const staged = await ctx.db.query('importStaging')
      .withIndex('by_manifest_table_public_id', (q) => {
        const prefix = q.eq('manifestHash', args.manifestHash).eq('sourceTable', args.sourceTable);
        return args.afterPublicId ? prefix.gt('sourcePublicId', args.afterPublicId) : prefix;
      }).take(10);
    const expected: Record<string, number> = {};
    const actual: Record<string, number> = {};
    let missing = 0;
    let mismatched = 0;
    for (const row of staged) {
      addImportMetrics(expected, args.sourceTable, row.payload);
      const doc = await ctx.db.query(table).withIndex('by_public_id', (q) => q.eq('publicId', row.sourcePublicId)).unique();
      if (!doc) { missing++; continue; }
      addImportMetrics(actual, args.sourceTable, doc);
      // Compare shared fields per record so aggregate counts cannot hide changed
      // prompts, answers, hashes, billing keys, snapshots, or swapped status values.
      for (const [key, expectedValue] of Object.entries(row.payload)) {
        if (key !== 'citations' && key in doc && canonicalJson(Reflect.get(doc, key)) !== canonicalJson(expectedValue)) mismatched++;
      }
      if (Array.isArray(row.payload.citations) && 'citations' in doc) {
        const urls = (citations: unknown[]) => citations.map((item) =>
          item && typeof item === 'object' && 'url' in item ? item.url : null);
        if (canonicalJson(urls(row.payload.citations)) !== canonicalJson(urls(doc.citations))) mismatched++;
      }
      if (args.sourceTable === 'users') {
        const org = await ctx.db.query('organizations')
          .withIndex('by_public_id', (q) => q.eq('publicId', row.payload.organizationPublicId)).unique();
        const userId = ctx.db.normalizeId('users', doc._id);
        const member = org && userId ? await ctx.db.query('memberships')
          .withIndex('by_organization_id_and_user_id', (q) => q.eq('organizationId', org._id).eq('userId', userId)).unique() : null;
        expected.memberships = (expected.memberships ?? 0) + 1;
        actual.memberships = (actual.memberships ?? 0) + (member ? 1 : 0);
        if (member && member.role !== row.payload.role) mismatched++;
      }
    }
    return { expected, actual, missing, mismatched,
      nextPublicId: staged.at(-1)?.sourcePublicId ?? null, complete: staged.length < 10 };
  },
});

export const destinationCountPage = internalQuery({
  args: { sourceTable: v.string(), afterPublicId: v.union(v.string(), v.null()) },
  returns: v.object({ count: v.number(), nextPublicId: v.union(v.string(), v.null()), complete: v.boolean() }),
  handler: async (ctx, args) => {
    if (!isImportSource(args.sourceTable)) throw new Error('unknown_import_table');
    const rows = await ctx.db.query(importTableTargets[args.sourceTable])
      .withIndex('by_public_id', (q) => args.afterPublicId ? q.gt('publicId', args.afterPublicId) : q).take(10);
    return { count: rows.length, nextPublicId: rows.at(-1)?.publicId ?? null, complete: rows.length < 10 };
  },
});
