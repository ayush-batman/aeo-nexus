import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { Workpool, vOnCompleteArgs } from '@convex-dev/workpool';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { internalMutation, internalQuery } from './_generated/server';
import { components, internal } from './_generated/api';
import { tenantMutation, tenantQuery, requireWorkspace, requireRole } from './lib/tenant';
import { engineValidator, nullableNumber, nullableString } from './validators';

const pool = new Workpool(components.measurementWorkpool, { maxParallelism: 4, retryActionsByDefault: false });
const limiter = new RateLimiter(components.rateLimiter, { analysis: { kind: 'fixed window', rate: 3, period: 3600_000 } });
const kindValidator = v.union(v.literal('accuracy'), v.literal('positioning'));
export const claimValue = v.object({ claim_text: v.string(), verdict: v.union(v.literal('true'), v.literal('false'), v.literal('outdated'), v.literal('unverified')),
  confidence: v.number(), evidence_url: nullableString, evidence_snippet: nullableString, reasoning: v.string() });
export const attributeValue = v.object({ entity_name: v.string(), entity_type: v.union(v.literal('brand'), v.literal('competitor')),
  attribute: v.string(), confidence: v.number() });

export const begin = tenantMutation({
  args: { workspaceId: v.string(), kind: kindValidator }, returns: v.object({ jobId: v.string() }),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    if (ctx.tenant.organization.plan === 'free') throw new Error('plan_required');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const recent = await ctx.db.query('analysisJobs').withIndex('by_workspace_kind_created', q => q.eq('workspaceId', workspace._id).eq('kind', args.kind)).order('desc').first();
    if (recent) {
      const tasks = await ctx.db.query('analysisTasks').withIndex('by_job', q => q.eq('jobId', recent._id)).take(40);
      if (tasks.some(t => t.status === 'pending' || t.status === 'running')) return { jobId: recent.publicId };
    }
    const allowed = await limiter.limit(ctx, 'analysis', { key: ctx.tenant.organization.publicId });
    if (!allowed.ok) throw new Error('rate_limit_exceeded');
    const scans = await ctx.db.query('scans').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc').take(args.kind === 'accuracy' ? 20 : 40);
    const website = typeof workspace.settings?.website === 'string' ? workspace.settings.website : null;
    const competitors = Array.isArray(workspace.settings?.competitors) ? workspace.settings.competitors.filter((s: unknown): s is string => typeof s === 'string').slice(0, 20) : [];
    const publicId = crypto.randomUUID();
    const jobId = await ctx.db.insert('analysisJobs', { publicId, workspaceId: workspace._id, kind: args.kind,
      requestedBy: ctx.tenant.user._id, brandName: workspace.name, website, competitors, createdAt: Date.now(), updatedAt: Date.now() });
    for (const scan of scans.filter(s => !s.failureCode && s.response.trim() && (args.kind !== 'accuracy' || s.brandMentioned))) {
      const taskId = await ctx.db.insert('analysisTasks', { jobId, scanId: scan._id, status: 'pending', count: 0, error: null });
      await pool.enqueueAction(ctx, internal.analysisActions.process, { taskId }, { retry: false,
        onComplete: internal.analysis.onComplete, context: { taskId } });
    }
    return { jobId: publicId };
  },
});

export const status = tenantQuery({
  args: { workspaceId: v.string(), jobId: v.string() },
  returns: v.object({ jobId: v.string(), status: v.union(v.literal('running'), v.literal('completed'), v.literal('partial'), v.literal('all_failed')),
    processed: v.number(), failed: v.number(), total: v.number(), claims: v.number(), attributes: v.number() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const job = await ctx.db.query('analysisJobs').withIndex('by_public_id', q => q.eq('publicId', args.jobId)).unique();
    if (!job || job.workspaceId !== workspace._id) throw new Error('analysis_not_found');
    const tasks = await ctx.db.query('analysisTasks').withIndex('by_job', q => q.eq('jobId', job._id)).take(40);
    const processed = tasks.filter(t => t.status === 'succeeded').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const count = tasks.reduce((sum, t) => sum + t.count, 0);
    return { jobId: args.jobId, status: tasks.some(t => ['pending', 'running'].includes(t.status)) ? 'running' as const
      : failed ? (processed ? 'partial' as const : 'all_failed' as const) : 'completed' as const,
      total: tasks.length, processed, failed, claims: job.kind === 'accuracy' ? count : 0, attributes: job.kind === 'positioning' ? count : 0 };
  },
});

export const input = internalQuery({
  args: { taskId: v.id('analysisTasks') },
  returns: v.object({ kind: kindValidator, response: v.string(), brandName: v.string(), website: nullableString, competitors: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    const job = task && await ctx.db.get(task.jobId);
    const scan = task && await ctx.db.get(task.scanId);
    if (!job || !scan || job.workspaceId !== scan.workspaceId) throw new Error('analysis_not_found');
    return { kind: job.kind, response: scan.response, brandName: job.brandName, website: job.website, competitors: job.competitors };
  },
});
export const claim = internalMutation({
  args: { taskId: v.id('analysisTasks') }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== 'pending') return false;
    await ctx.db.patch(task._id, { status: 'running' }); return true;
  },
});
export const save = internalMutation({
  args: { taskId: v.id('analysisTasks'), claims: v.array(claimValue), attributes: v.array(attributeValue) }, returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task || task.status !== 'running') return null;
    const job = await ctx.db.get(task.jobId);
    const scan = await ctx.db.get(task.scanId);
    if (!job || !scan || job.workspaceId !== scan.workspaceId) throw new Error('analysis_not_found');
    if (args.claims.length > 30 || args.attributes.length > 60) throw new Error('invalid_analysis_size');
    for (const value of [...args.claims, ...args.attributes]) if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) throw new Error('invalid_analysis_confidence');
    // Replace only after successful extraction/verification; the whole change is atomic.
    if (job.kind === 'accuracy') {
      const old = await ctx.db.query('accuracyClaims').withIndex('by_scan_id', q => q.eq('scanId', scan._id)).take(101);
      if (old.length > 100) throw new Error('analysis_legacy_batch_too_large');
      for (const row of old) await ctx.db.delete(row._id);
      for (const row of args.claims) {
        if (!row.claim_text.trim() || row.claim_text.length > 500 || (row.verdict !== 'unverified' && (!row.evidence_url || !row.evidence_snippet))) throw new Error('invalid_claim_evidence');
        await ctx.db.insert('accuracyClaims', { publicId: crypto.randomUUID(), workspaceId: job.workspaceId,
          scanId: scan._id, claimText: row.claim_text, verdict: row.verdict, confidence: row.confidence,
          evidenceUrl: row.evidence_url, evidenceSnippet: row.evidence_snippet, reasoning: row.reasoning, createdAt: Date.now() });
      }
    } else {
      const old = await ctx.db.query('competitorAttributes').withIndex('by_scan_id', q => q.eq('scanId', scan._id)).take(101);
      if (old.length > 100) throw new Error('analysis_legacy_batch_too_large');
      for (const row of old) await ctx.db.delete(row._id);
      for (const row of args.attributes) await ctx.db.insert('competitorAttributes', { publicId: crypto.randomUUID(),
        workspaceId: job.workspaceId, scanId: scan._id, entityName: row.entity_name, entityType: row.entity_type,
        attribute: row.attribute, confidence: row.confidence, platform: scan.platform, createdAt: Date.now() });
    }
    await ctx.db.patch(task._id, { status: 'succeeded', count: job.kind === 'accuracy' ? args.claims.length : args.attributes.length });
    await ctx.db.patch(job._id, { updatedAt: Date.now() });
    return null;
  },
});
export const onComplete = internalMutation({
  args: vOnCompleteArgs(v.object({ taskId: v.id('analysisTasks') }), v.null()), returns: v.null(),
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.context.taskId);
    if (task && task.status !== 'succeeded') await ctx.db.patch(task._id, { status: 'failed', error: 'analysis_interrupted_or_failed' });
    return null;
  },
});

export const claims = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), scan_id: v.string(), claim_text: v.string(),
    verdict: claimValue.fields.verdict, confidence: nullableNumber, evidence_url: nullableString, evidence_snippet: nullableString,
    reasoning: nullableString, created_at: v.string(), scan: v.object({ platform: engineValidator, prompt: v.string(), created_at: v.string() }) })),
    isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    if (ctx.tenant.organization.plan === 'free') throw new Error('plan_required');
    const result = await ctx.db.query('accuracyClaims').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    const page = await Promise.all(result.page.map(async row => {
      const scan = await ctx.db.get(row.scanId);
      if (!scan || scan.workspaceId !== workspace._id) throw new Error('invalid_claim_scan');
      return { id: row.publicId, scan_id: scan.publicId, claim_text: row.claimText, verdict: row.verdict,
        confidence: row.confidence, evidence_url: row.evidenceUrl, evidence_snippet: row.evidenceSnippet, reasoning: row.reasoning,
        created_at: new Date(row.createdAt).toISOString(), scan: { platform: scan.platform, prompt: scan.prompt, created_at: new Date(scan.createdAt).toISOString() } };
    }));
    return { page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const attributes = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ entity_name: v.string(), entity_type: attributeValue.fields.entity_type,
    attribute: v.string(), confidence: nullableNumber, platform: engineValidator, created_at: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    if (ctx.tenant.organization.plan === 'free') throw new Error('plan_required');
    const result = await ctx.db.query('competitorAttributes').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    return { page: result.page.map(row => ({ entity_name: row.entityName, entity_type: row.entityType, attribute: row.attribute,
      confidence: row.confidence, platform: row.platform, created_at: new Date(row.createdAt).toISOString() })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
