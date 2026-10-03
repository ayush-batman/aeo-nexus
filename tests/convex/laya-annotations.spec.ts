import { afterEach, expect, test, vi } from 'vitest';
import { internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

afterEach(() => vi.unstubAllEnvs());
async function seed(count: number) {
  const f = await fixture();
  const ids = await f.t.run(async ctx => {
    const workspace = await ctx.db.query('workspaces').first();
    const out = [];
    for (let i = 0; i < count; i++) out.push(await ctx.db.insert('scans', { publicId: `s${i}`, workspaceId: workspace!._id, platform: 'gemini',
      prompt: `p${i}`, response: `answer ${i}`, brandMentioned: true, brandVariants: ['Aelo'], mentionPosition: 1, sentiment: null, sentimentScore: null,
      sentimentReason: null, competitorsMentioned: [], listItems: [], analyzerConfidence: null, analyzerMethod: null, analyzerModel: null,
      citations: [], winner: null, winnerReason: null, measurementRunId: null, measurementContractVersion: null, sampleNumber: null,
      providerModel: null, measurementRegion: null, measurementMode: null, scorerVersion: null, failureCode: null, failureMessage: null,
      createdAt: Date.now() }));
    return out;
  });
  return { ...f, ids };
}
const ann = { classifierVersion: 'laya-v1', sentiment: 'positive' as const, confidence: 0.9, labels: { intent: 'compare' } };

test('pending skips annotated scans and is per classifier version', async () => {
  const { t, ids } = await seed(3);
  await t.mutation(internal.layaAnnotations.record, { scanId: ids[0], ...ann });
  const r = await t.query(internal.layaAnnotations.pending, { classifierVersion: 'laya-v1' });
  expect(r.items.map(i => i.scanId)).toEqual([ids[1], ids[2]]);
  expect(r.next).toBeNull();
  expect((await t.query(internal.layaAnnotations.pending, { classifierVersion: 'laya-v2' })).items).toHaveLength(3);
});
test('pending pages with a cursor', async () => {
  const { t, ids } = await seed(3);
  const first = await t.query(internal.layaAnnotations.pending, { classifierVersion: 'laya-v1', limit: 2 });
  expect(first.items).toHaveLength(2);
  const second = await t.query(internal.layaAnnotations.pending, { classifierVersion: 'laya-v1', limit: 2, after: first.next! });
  expect(second.items.map(i => i.scanId)).toEqual([ids[2]]);
});
test('record is an idempotent upsert, clamps confidence and rejects unknown scans', async () => {
  const { t, ids } = await seed(1);
  const a = await t.mutation(internal.layaAnnotations.record, { scanId: ids[0], ...ann, confidence: 7 });
  const b = await t.mutation(internal.layaAnnotations.record, { scanId: ids[0], ...ann, sentiment: 'negative' });
  expect(b).toEqual(a);
  const rows = await t.run(ctx => ctx.db.query('layaAnnotations').collect());
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ sentiment: 'negative', confidence: 0.9 });
  await t.run(ctx => ctx.db.delete(ids[0]));
  await expect(t.mutation(internal.layaAnnotations.record, { scanId: ids[0], ...ann })).rejects.toThrow('scan_not_found');
});
test('worker endpoints fail closed without the secret and work with it', async () => {
  const { t, ids } = await seed(1);
  expect((await t.fetch('/laya/pending?classifierVersion=laya-v1')).status).toBe(401);
  vi.stubEnv('LAYA_WORKER_SECRET', 'synthetic-secret');
  expect((await t.fetch('/laya/pending?classifierVersion=laya-v1', { headers: { authorization: 'Bearer wrong-secret!' } })).status).toBe(401);
  const h = { authorization: 'Bearer synthetic-secret', 'content-type': 'application/json' };
  const got = await (await t.fetch('/laya/pending?classifierVersion=laya-v1', { headers: h })).json();
  expect(got.items).toHaveLength(1);
  const res = await t.fetch('/laya/annotations', { method: 'POST', headers: h, body: JSON.stringify({ scanId: ids[0], ...ann }) });
  expect(res.status).toBe(200);
  expect((await t.fetch('/laya/annotations', { method: 'POST', headers: h, body: '{}' })).status).toBe(400);
});
