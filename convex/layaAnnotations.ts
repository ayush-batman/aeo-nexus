import { v } from 'convex/values';
import { httpAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { sentimentValidator } from './validators';

// Local Laya classifier worker contract. Additive: it only reads `scans` and writes `layaAnnotations`.
const SCAN_PAGE = 200;

/** Next page of scans (oldest first) with no annotation for this classifier version. */
export const pending = internalQuery({
  args: { classifierVersion: v.string(), after: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { classifierVersion, after = 0, limit = 50 }) => {
    const max = Math.max(1, Math.min(limit, 100));
    const page = await ctx.db.query('scans').withIndex('by_creation_time', q => q.gt('_creationTime', after)).order('asc').take(SCAN_PAGE);
    const items = [];
    let cursor = after;
    for (const scan of page) {
      cursor = scan._creationTime;
      if (scan.response && !scan.failureCode) {
        const done = await ctx.db.query('layaAnnotations').withIndex('by_scan_version', q => q.eq('scanId', scan._id).eq('classifierVersion', classifierVersion)).unique();
        if (!done) items.push({ scanId: scan._id, prompt: scan.prompt, response: scan.response, platform: scan.platform, brandVariants: scan.brandVariants });
      }
      if (items.length >= max) break;
    }
    // `next` is the cursor for the following call; null once the table is exhausted.
    return { items, next: items.length >= max || page.length === SCAN_PAGE ? cursor : null };
  },
});

/** Idempotent upsert of one classifier result per (scan, version). */
export const record = internalMutation({
  args: { scanId: v.id('scans'), classifierVersion: v.string(), sentiment: v.union(sentimentValidator, v.null()), confidence: v.number(), labels: v.record(v.string(), v.string()) },
  handler: async (ctx, a) => {
    const scan = await ctx.db.get(a.scanId);
    if (!scan) throw new Error('scan_not_found');
    if (!a.classifierVersion.trim() || !Number.isFinite(a.confidence)) throw new Error('invalid_annotation');
    const now = Date.now();
    const row = { scanId: a.scanId, workspaceId: scan.workspaceId, classifierVersion: a.classifierVersion, sentiment: a.sentiment,
      confidence: Math.min(1, Math.max(0, a.confidence)), labels: a.labels, updatedAt: now };
    const prev = await ctx.db.query('layaAnnotations').withIndex('by_scan_version', q => q.eq('scanId', a.scanId).eq('classifierVersion', a.classifierVersion)).unique();
    if (prev) { await ctx.db.patch(prev._id, row); return prev._id; }
    return ctx.db.insert('layaAnnotations', { ...row, createdAt: now });
  },
});

function authorized(req: Request) {
  const secret = process.env.LAYA_WORKER_SECRET;
  const got = req.headers.get('authorization') ?? '';
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const pendingHttp = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'unauthorized' }, 401);
  const u = new URL(req.url);
  const classifierVersion = u.searchParams.get('classifierVersion');
  if (!classifierVersion) return json({ error: 'classifierVersion_required' }, 400);
  const after = Number(u.searchParams.get('after') ?? 0);
  const limit = Number(u.searchParams.get('limit') ?? 50);
  if (!Number.isFinite(after) || !Number.isFinite(limit)) return json({ error: 'bad_cursor' }, 400);
  return json(await ctx.runQuery(internal.layaAnnotations.pending, { classifierVersion, after, limit }));
});

export const recordHttp = httpAction(async (ctx, req) => {
  if (!authorized(req)) return json({ error: 'unauthorized' }, 401);
  try {
    const b = await req.json();
    const id = await ctx.runMutation(internal.layaAnnotations.record, b);
    return json({ id });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'bad_request' }, 400);
  }
});
