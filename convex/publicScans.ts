import { v } from 'convex/values';
import { query, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { citationValidator, nullableString, nullableNumber, sentimentValidator } from './validators';
import { scanResult } from './lib/measurementContract';
import { recommendationEvidence } from './lib/recommendationEvidence';

const publicReceipt = v.object({ id: v.string(), brand_name: v.string(), prompt: v.string(), platform: v.string(), response: nullableString,
  brand_mentioned: v.union(v.boolean(), v.null()), mention_position: nullableNumber, sentiment: v.union(sentimentValidator, v.null()),
  competitors_mentioned: v.array(v.string()), citations: v.array(citationValidator), error_message: nullableString, created_at: v.string(),
  status: v.string(), provider_model: nullableString, scorer_version: nullableString, sample_count: v.number(),
  recommendation_status: v.union(v.literal('recommended'), v.literal('not_recommended'), v.literal('unassessed'), v.literal('not_mentioned'), v.null()),
  recommendation_evidence: nullableString });
export const get = query({
  args: { id: v.string() }, returns: v.union(publicReceipt, v.null()),
  handler: async (ctx, args) => {
    if (!/^[a-f0-9-]{36}$/i.test(args.id)) return null;
    const row = await ctx.db.query('publicScans').withIndex('by_public_id', q => q.eq('publicId', args.id)).unique();
    if (!row || row.status === 'expired' || row.expiresAt <= Date.now()) return null;
    let status = row.status ?? (row.errorMessage ? 'failed' : row.response ? 'complete' : 'failed');
    const timedOut = ['queued', 'running'].includes(status) && Date.now()-row.createdAt > 10*60_000;
    if (timedOut) status = 'failed';
    return { id: row.publicId, brand_name: row.brandName, prompt: row.prompt, platform: row.platform, response: row.response,
      brand_mentioned: row.brandMentioned, mention_position: row.mentionPosition, sentiment: row.sentiment,
      competitors_mentioned: row.competitorsMentioned, citations: row.citations,
      error_message: timedOut ? 'The provider did not finish within the allowed time.' : row.errorMessage,
      created_at: new Date(row.createdAt).toISOString(), status, provider_model: row.providerModel ?? null, scorer_version: row.scorerVersion ?? null,
      sample_count: row.response && !row.errorMessage ? 1 : 0,
      recommendation_status: row.recommendationStatus ?? null, recommendation_evidence: row.recommendationEvidence ?? null };
  },
});
export const reserve = internalMutation({
  args: { id: v.string(), ipHash: v.string(), brandName: v.string(), prompt: v.string() },
  returns: v.object({ id: v.string(), used: v.number() }),
  handler: async (ctx, args) => {
    if (!/^[a-f0-9-]{36}$/i.test(args.id) || !/^[a-f0-9]{64}$/i.test(args.ipHash) || args.brandName.trim().length < 2 || args.brandName.length > 80 ||
      args.prompt.trim().length < 8 || args.prompt.length > 240) throw new Error('invalid_public_scan');
    const existing = await ctx.db.query('publicScans').withIndex('by_public_id', q => q.eq('publicId', args.id)).unique();
    const recent = await ctx.db.query('publicScans').withIndex('by_ip_hash_and_created_at', q => q.eq('ipHash', args.ipHash).gte('createdAt', Date.now()-7*86400000)).take(3);
    if (existing) {
      if (existing.ipHash !== args.ipHash || existing.brandName !== args.brandName || existing.prompt !== args.prompt) throw new Error('request_id_conflict');
      return { id: existing.publicId, used: recent.length };
    }
    if (recent.length >= 3) throw new Error('rate_limit_exceeded');
    const id = await ctx.db.insert('publicScans', { publicId: args.id, ipHash: args.ipHash, brandName: args.brandName, prompt: args.prompt, platform: 'gemini',
      status: 'queued', response: null, brandMentioned: null, mentionPosition: null, sentiment: null, competitorsMentioned: [], citations: [], errorMessage: null,
      email: null, createdAt: Date.now(), expiresAt: Date.now()+30*86400000 });
    await ctx.scheduler.runAfter(0, internal.publicScanActions.execute, { id });
    await ctx.scheduler.runAfter(10*60_000, internal.publicScans.expire, { id, receipt: false });
    await ctx.scheduler.runAfter(30*86400000, internal.publicScans.expire, { id, receipt: true });
    return { id: args.id, used: recent.length+1 };
  },
});
// Stored transitions invalidate subscribed/cached queries; Date.now alone does not.
export const expire = internalMutation({
  args: { id: v.id('publicScans'), receipt: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    if (args.receipt && row.expiresAt <= Date.now()) await ctx.db.patch(row._id, { status: 'expired' });
    else if (!args.receipt && ['queued', 'running'].includes(row.status ?? '') && Date.now()-row.createdAt >= 10*60_000)
      await ctx.db.patch(row._id, { status: 'failed', errorMessage: 'The provider did not finish within the allowed time.' });
    return null;
  },
});
export const claim = internalMutation({
  args: { id: v.id('publicScans') }, returns: v.union(v.object({ brandName: v.string(), prompt: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.status !== 'queued') return null;
    await ctx.db.patch(row._id, { status: 'running' });
    return { brandName: row.brandName, prompt: row.prompt };
  },
});
export const finish = internalMutation({
  args: { id: v.id('publicScans'), result: v.union(scanResult, v.null()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row || row.status !== 'running') return null;
    const r = args.result;
    if (!r || !r.response.trim()) { await ctx.db.patch(row._id, { status: 'failed', errorMessage: 'The scan provider did not return usable evidence. Please retry later.' }); return null; }
    await ctx.db.patch(row._id, { status: 'complete', response: r.response, brandMentioned: r.brandMentioned, mentionPosition: r.mentionPosition,
      sentiment: r.sentiment, competitorsMentioned: r.competitorsMentioned, citations: r.citations.map(c => ({ url: c.url, title: c.title,
        isOwnDomain: c.is_own_domain, provenance: c.provenance, provider: c.provider, sampleId: c.sample_id,
        rawProviderReference: c.raw_provider_reference, fetchValidation: c.fetch_validation })),
      providerModel: r.providerModel ?? null, scorerVersion: r.scorerVersion ?? null,
      ...recommendationEvidence({ status: r.recommendationStatus, evidence: r.recommendationEvidence,
        method: r.recommendationMethod, response: r.response, brandMentioned: r.brandMentioned,
        brandName: row.brandName }), errorMessage: null });
    return null;
  },
});
