import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
test('public scans reserve quota atomically, replay safely and hide private fields', async () => {
  const { t } = await fixture();
  const input = { ipHash: 'a'.repeat(64), brandName: 'Synthetic', prompt: 'Which tools help testing?' };
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
  await t.mutation(internal.publicScans.reserve, { ...input, id: ids[0] });
  await t.mutation(internal.publicScans.reserve, { ...input, id: ids[0] });
  await t.mutation(internal.publicScans.reserve, { ...input, id: ids[1] });
  await t.mutation(internal.publicScans.reserve, { ...input, id: ids[2] });
  await expect(t.mutation(internal.publicScans.reserve, { ...input, id: ids[3] })).rejects.toThrow('rate_limit_exceeded');
  const receipt = await t.query(api.publicScans.get, { id: ids[0] });
  expect(receipt).toMatchObject({ status: 'queued', brand_mentioned: null, sample_count: 0 });
  expect(receipt).not.toHaveProperty('ipHash'); expect(receipt).not.toHaveProperty('email');
  await t.run(async ctx => { const row = await ctx.db.query('publicScans').withIndex('by_public_id', q => q.eq('publicId', ids[0])).unique(); await ctx.db.patch(row!._id, { expiresAt: Date.now()-1 }); });
  expect(await t.query(api.publicScans.get, { id: ids[0] })).toBeNull();
});

test('public scan watchdog stores terminal states without exposing or deleting evidence', async () => {
  const { t } = await fixture();
  const publicId = crypto.randomUUID();
  await t.mutation(internal.publicScans.reserve, { id: publicId, ipHash: 'b'.repeat(64), brandName: 'Synthetic', prompt: 'Which tools help testing?' });
  const id = await t.run(async ctx => {
    const row = await ctx.db.query('publicScans').withIndex('by_public_id', q => q.eq('publicId', publicId)).unique();
    await ctx.db.patch(row!._id, { status: 'running', createdAt: Date.now()-11*60_000 });
    return row!._id;
  });
  await t.mutation(internal.publicScans.expire, { id, receipt: false });
  expect(await t.query(api.publicScans.get, { id: publicId })).toMatchObject({ status: 'failed', sample_count: 0 });
  await t.run(ctx => ctx.db.patch(id, { expiresAt: Date.now()-1 }));
  await t.mutation(internal.publicScans.expire, { id, receipt: true });
  expect(await t.query(api.publicScans.get, { id: publicId })).toBeNull();
  expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ status: 'expired' });
});

test('public receipts separate recommendation evidence and leave legacy rows unassessed', async () => {
  const { t } = await fixture();
  const publicId = crypto.randomUUID();
  await t.mutation(internal.publicScans.reserve, { id: publicId, ipHash: 'c'.repeat(64), brandName: 'Buffer', prompt: 'Which social tools help small teams?' });
  const rowId = await t.run(async ctx => {
    const row = await ctx.db.query('publicScans').withIndex('by_public_id', q => q.eq('publicId', publicId)).unique();
    await ctx.db.patch(row!._id, { status: 'complete', response: 'Alternatives to Buffer include Planable.', brandMentioned: true });
    return row!._id;
  });
  expect(await t.query(api.publicScans.get, { id: publicId })).toMatchObject({
    brand_mentioned: true, recommendation_status: null, recommendation_evidence: null,
  });
  await t.run(ctx => ctx.db.patch(rowId, {
    recommendationStatus: 'not_recommended', recommendationEvidence: 'Alternatives to Buffer include Planable.',
  }));
  expect(await t.query(api.publicScans.get, { id: publicId })).toMatchObject({
    brand_mentioned: true, recommendation_status: 'not_recommended',
    recommendation_evidence: 'Alternatives to Buffer include Planable.',
  });
});

test('public receipt exposes answer-backed name candidates without pretending rivals were tracked', async () => {
  const { t } = await fixture();
  const publicId = crypto.randomUUID();
  await t.mutation(internal.publicScans.reserve, { id: publicId, ipHash: 'd'.repeat(64), brandName: 'Buffer', prompt: 'Which alternatives to Buffer work for teams?' });
  const response = 'Alternatives to Buffer:\n* **Hootsuite** is a scheduling tool.\n* **Planable** offers approval workflows.\n* **Buffer** is the product to replace.';
  await t.run(async ctx => {
    const row = await ctx.db.query('publicScans').withIndex('by_public_id', q => q.eq('publicId', publicId)).unique();
    await ctx.db.patch(row!._id, { status: 'complete', response, brandMentioned: true });
  });
  expect(await t.query(api.publicScans.get, { id: publicId })).toMatchObject({
    competitors_mentioned: [], competitor_tracking_status: 'not_configured',
    answer_name_candidates: [
      { name: 'Hootsuite', evidence: '* **Hootsuite** is a scheduling tool.' },
      { name: 'Planable', evidence: '* **Planable** offers approval workflows.' },
    ],
  });
});
