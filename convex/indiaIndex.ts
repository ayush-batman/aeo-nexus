import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { query } from './_generated/server';
import { tenantMutation } from './lib/tenant';
import { nullableString, nullableNumber, sentimentValidator } from './validators';
import { legacyCitation } from './lib/measurementContract';
import { estimateMentionConfidence } from '../lib/measurement/confidence';
const category = v.union(v.literal('SaaS'), v.literal('D2C'), v.literal('Fintech'), v.literal('EdTech'), v.literal('Consumer'));
const entry = v.object({ brand: v.string(), category, website: nullableString, mentionRatePct: v.number(), avgPosition: nullableNumber, scanCount: v.number(),
  sentiment: v.union(sentimentValidator, v.null()), publishedAt: v.number(), intervalLower: v.number(), intervalUpper: v.number() });
/** Only explicit publications can be read anonymously. Workspace names never authorize access. */
export const entries = query({
  args: { edition: v.string(), paginationOpts: paginationOptsValidator }, returns: v.object({ page: v.array(entry), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const result = await ctx.db.query('indexPublications').withIndex('by_edition', q => q.eq('edition', args.edition)).paginate({ ...args.paginationOpts, numItems: Math.min(100,args.paginationOpts.numItems) });
    return { page: result.page.map(row => { const confidence = estimateMentionConfidence(row.mentionCount, row.sampleCount); return {
      brand: row.brand, category: row.category, website: row.website, mentionRatePct: Math.round(row.mentionCount/row.sampleCount*100),
      avgPosition: row.avgPosition, scanCount: row.sampleCount, sentiment: row.sentiment, publishedAt: row.publishedAt,
      intervalLower: confidence.interval!.lower, intervalUpper: confidence.interval!.upper,
    }; }), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
const receipt = v.object({ id: v.string(), platform: v.string(), prompt: v.string(), response: v.string(), brand_mentioned: v.boolean(), mention_position: nullableNumber,
  sentiment: v.union(sentimentValidator, v.null()), competitors_mentioned: v.array(v.string()), citations: v.array(legacyCitation), created_at: v.string(),
  provider_model: nullableString, measurement_region: nullableString, measurement_mode: nullableString, scorer_version: nullableString,
  measurement_contract_version: nullableString, search_mode: nullableString, analyzer_method: nullableString, analyzer_model: nullableString, analyzer_prompt_version: nullableString });
export const receipts = query({
  args: { edition: v.string(), brand: v.string(), offset: v.number() }, returns: v.object({ scans: v.array(receipt), nextOffset: nullableNumber }),
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.offset) || args.offset < 0 || args.offset > 50) throw new Error('invalid_offset');
    const publication = await ctx.db.query('indexPublications').withIndex('by_edition_brand', q => q.eq('edition',args.edition).eq('brand',args.brand)).unique();
    if (!publication) return { scans: [], nextOffset: null };
    const selected = publication.scanIds.slice(args.offset,args.offset+5);
    const rows = await Promise.all(selected.map(id => ctx.db.get(id)));
    if (rows.some(row => !row || row.workspaceId !== publication.workspaceId)) throw new Error('published_evidence_unavailable');
    return { scans: rows.map(row => { const s = row!; return { id:s.publicId, platform:s.platform, prompt:s.prompt, response:s.response, brand_mentioned:s.brandMentioned,
      mention_position:s.mentionPosition, sentiment:s.sentiment, competitors_mentioned:s.competitorsMentioned, citations:s.citations.map(c => ({url:c.url,title:c.title,
        is_own_domain:c.isOwnDomain,provenance:c.provenance,provider:c.provider,sample_id:c.sampleId,raw_provider_reference:c.rawProviderReference,fetch_validation:c.fetchValidation})),
      created_at:new Date(s.createdAt).toISOString(), provider_model:s.providerModel,measurement_region:s.measurementRegion,measurement_mode:s.measurementMode,
      scorer_version:s.scorerVersion,measurement_contract_version:s.measurementContractVersion,search_mode:s.searchMode??null,analyzer_method:s.analyzerMethod,
      analyzer_model:s.analyzerModel,analyzer_prompt_version:s.analyzerPromptVersion??null }; }), nextOffset: args.offset+selected.length < publication.scanIds.length ? args.offset+selected.length : null };
  },
});
export const publish = tenantMutation({
  args: { edition: v.string(), workspaceId: v.string(), brand: v.string(), category, website: nullableString, scanIds: v.array(v.string()) }, returns: v.string(),
  handler: async (ctx, args) => {
    if (!ctx.tenant.user.isSuperAdmin) throw new Error('forbidden_role');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(args.edition) || !args.brand.trim() || args.brand.length>200 || args.scanIds.length<4 || args.scanIds.length>50 || new Set(args.scanIds).size!==args.scanIds.length) throw new Error('invalid_publication');
    const brand = args.brand.trim();
    if (args.website) {
      let url: URL;
      try { url = new URL(args.website); } catch { throw new Error('invalid_website'); }
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || args.website.length > 2048) throw new Error('invalid_website');
    }
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id',q=>q.eq('publicId',args.workspaceId)).unique();
    if (!workspace) throw new Error('workspace_not_found');
    if (await ctx.db.query('indexPublications').withIndex('by_edition_brand',q=>q.eq('edition',args.edition).eq('brand',brand)).unique()) throw new Error('publication_already_exists');
    const rows = await Promise.all(args.scanIds.map(id=>ctx.db.query('scans').withIndex('by_public_id',q=>q.eq('publicId',id)).unique()));
    const fields = ['prompt','platform','providerModel','measurementRegion','measurementMode','scorerVersion','measurementContractVersion','searchMode','analyzerMethod','analyzerModel','analyzerPromptVersion'] as const;
    let cohortKey: string | null = null;
    for (const row of rows) {
      if (!row || row.workspaceId!==workspace._id || row.failureCode || !row.response.trim() || fields.some(field=>!row[field])) throw new Error('invalid_publication_evidence');
      if (new Date(row.createdAt).toISOString().slice(0,7)!==args.edition) throw new Error('invalid_publication_period');
      const key=JSON.stringify(fields.map(field=>row[field])); if (cohortKey && key!==cohortKey) throw new Error('incompatible_publication'); cohortKey=key;
    }
    const prior = await ctx.db.query('indexPublications').withIndex('by_edition',q=>q.eq('edition',args.edition)).first();
    if (prior && prior.cohortKey!==cohortKey) throw new Error('incompatible_publication');
    const scans=rows.map(row=>row!); const positions=scans.flatMap(s=>s.brandMentioned && s.mentionPosition!==null && s.mentionPosition>=1 ? [s.mentionPosition]:[]);
    const publicId=crypto.randomUUID();
    await ctx.db.insert('indexPublications',{ publicId, edition:args.edition,brand,category:args.category,website:args.website,workspaceId:workspace._id,
      scanIds:scans.map(s=>s._id),cohortKey:cohortKey!,mentionCount:scans.filter(s=>s.brandMentioned).length,sampleCount:scans.length,
      avgPosition:positions.length?positions.reduce((a,b)=>a+b,0)/positions.length:null,sentiment:null,publishedAt:Date.now(),publishedBy:ctx.tenant.user._id });
    return publicId;
  },
});
