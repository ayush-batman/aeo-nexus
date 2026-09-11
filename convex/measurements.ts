import { v } from 'convex/values';
import { start } from '@convex-dev/workflow';
import type { Doc } from './_generated/dataModel';
import { internal } from './_generated/api';
import { internalMutation, internalQuery, type MutationCtx } from './_generated/server';
import { requireRole, requireWorkspace, tenantMutation, tenantQuery, type TenantContext } from './lib/tenant';
import { newPublicId } from './lib/publicIds';
import { measurementInput, measurementResult, scanResult } from './lib/measurementContract';
import { limits } from './lib/limits';
import { engineValidator, nullableString } from './validators';
import { upsertScanMetric } from './lib/scanMetrics';

export const capabilities = tenantQuery({
  args: {}, returns: v.object({ available: v.array(v.object({ platform: engineValidator, available: v.boolean() })), allowedEngines: v.array(v.string()) }),
  handler: async (ctx) => ({
    available: [
      { platform: 'gemini' as const, available: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) },
      { platform: 'chatgpt' as const, available: Boolean(process.env.OPENAI_API_KEY || (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT)) },
      { platform: 'claude' as const, available: Boolean(process.env.ANTHROPIC_API_KEY) },
      { platform: 'perplexity' as const, available: Boolean(process.env.PERPLEXITY_API_KEY) },
    ],
    allowedEngines: ctx.tenant.organization.plan === 'free' ? ['gemini'] : ['chatgpt', 'gemini', 'claude', 'perplexity'],
  }),
});

export async function beginMeasurement(ctx: MutationCtx, tenant: TenantContext,
  workspace: Doc<'workspaces'>, requestId: string, input: Doc<'measurementRuns'>['input'], quotaRequestId = requestId): Promise<string> {
  requireRole(tenant, 'editor');
  if (workspace.organizationId !== tenant.organization._id) throw new Error('workspace_not_found');
  const existing = await ctx.db.query('measurementRuns').withIndex('by_organization_request', (q) =>
    q.eq('organizationId', tenant.organization._id).eq('requestId', requestId)).unique();
  if (existing) {
    if (existing.workspaceId !== workspace._id || JSON.stringify(existing.input) !== JSON.stringify(input)) throw new Error('request_id_conflict');
    return existing.publicId;
  }
  if (!requestId || requestId.length > 200 || !input.prompt.trim() || input.prompt.length > 2000 ||
    !input.brandName.trim() || input.brandName.length > 200 || !Number.isInteger(input.samples) || input.samples < 1 || input.samples > 8 ||
    !input.platforms.length || input.platforms.length > 4 || new Set(input.platforms).size !== input.platforms.length ||
    (input.competitors?.length ?? 0) > 20 || input.competitors?.some((name) => !name.trim() || name.length > 100)) throw new Error('invalid_measurement');
  const allowed = tenant.organization.plan === 'free' ? ['gemini'] : ['chatgpt', 'gemini', 'claude', 'perplexity'];
  if (input.platforms.some((platform) => !allowed.includes(platform))) throw new Error('engine_not_entitled');
  const now = Date.now();
  // Free plans can have at most three units in the rolling seven-day window;
  // reading four rows is sufficient to fail closed and stays bounded.
  const reserved = await ctx.db.query('scanQuotaReservations').withIndex('by_organization_id_and_request_id', q =>
    q.eq('organizationId', tenant.organization._id).eq('requestId', quotaRequestId)).unique();
  if (!reserved) {
    const decision = await limits.limit(ctx, 'measurement', { key: tenant.organization.publicId });
    if (!decision.ok) throw new Error('rate_limit_exceeded');
  }
  if (!reserved && tenant.organization.plan === 'free') {
    const used = await ctx.db.query('scanQuotaReservations').withIndex('by_organization_id_and_created_at', (q) =>
      q.eq('organizationId', tenant.organization._id).gte('createdAt', now - 7 * 86400000)).take(4);
    if (used.some(row => !Number.isSafeInteger(row.units) || row.units < 1) || used.reduce((sum, row) => sum + row.units, 0) >= 3) throw new Error('scan_quota_exceeded');
  }
  const publicId = newPublicId();
  const runId = await ctx.db.insert('measurementRuns', { publicId, workspaceId: workspace._id,
    organizationId: tenant.organization._id, requestId, input, status: 'queued', result: null,
    workflowId: null, createdAt: now, updatedAt: now });
  if (!reserved) await ctx.db.insert('scanQuotaReservations', { publicId: newPublicId(), organizationId: tenant.organization._id,
    requestId: quotaRequestId, units: 1, createdAt: now });
  for (let sampleNumber = 1; sampleNumber <= input.samples; sampleNumber++) {
    for (const engine of input.platforms) await ctx.db.insert('measurementSamples', { runId, engine, sampleNumber,
      status: 'pending', result: null, error: null, createdAt: now, updatedAt: now });
  }
  const workflowId = await start(ctx, internal.measurementWorkflow.run, { runId }, {
    startAsync: true,
    onComplete: internal.measurementWorkflow.onComplete, context: { runId },
  });
  await ctx.db.patch(runId, { workflowId });
  return publicId;
}

export const begin = tenantMutation({
  args: { workspaceId: v.string(), requestId: v.string(), input: measurementInput }, returns: v.string(),
  handler: async (ctx, args): Promise<string> => beginMeasurement(ctx, ctx.tenant,
    await requireWorkspace(ctx, ctx.tenant, args.workspaceId), args.requestId, args.input),
});

export const get = tenantQuery({
  args: { workspaceId: v.string(), runId: v.string() },
  returns: v.object({ runId: v.string(), status: v.string(), result: v.union(measurementResult, v.null()), resultUrl: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const run = await ctx.db.query('measurementRuns').withIndex('by_public_id', (q) => q.eq('publicId', args.runId)).unique();
    if (!run || run.workspaceId !== workspace._id) throw new Error('measurement_not_found');
    const resultUrl = run.resultStorageId ? await ctx.storage.getUrl(run.resultStorageId) : null;
    if (run.resultStorageId && !resultUrl) throw new Error('measurement_evidence_unavailable');
    return { runId: run.publicId, status: run.status, result: run.resultStorageId ? null : run.result, resultUrl };
  },
});

export const answers = tenantQuery({
  args: { workspaceId: v.string(), runId: v.string(), sampleNumber: v.number() }, returns: v.array(scanResult),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const run = await ctx.db.query('measurementRuns').withIndex('by_public_id', (q) => q.eq('publicId', args.runId)).unique();
    if (!run || run.workspaceId !== workspace._id) throw new Error('measurement_not_found');
    const rows = await ctx.db.query('measurementSamples').withIndex('by_run_sample_engine', (q) =>
      q.eq('runId', run._id).eq('sampleNumber', args.sampleNumber)).take(4);
    return rows.flatMap((row) => row.result ? [row.result] : []);
  },
});

export const executionInput = internalQuery({
  args: { runId: v.id('measurementRuns') },
  returns: v.object({ publicId: v.string(), input: measurementInput, startedAt: v.string(), finished: v.boolean() }),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('measurement_not_found');
    return { publicId: run.publicId, input: run.input, startedAt: new Date(run.createdAt).toISOString(), finished: !['queued', 'running'].includes(run.status) };
  },
});

const slotArgs = { runId: v.id('measurementRuns'), engine: engineValidator, sampleNumber: v.number() };
export const claimSample = internalMutation({
  args: slotArgs, returns: v.boolean(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.query('measurementSamples').withIndex('by_run_sample_engine', (q) =>
      q.eq('runId', args.runId).eq('sampleNumber', args.sampleNumber).eq('engine', args.engine)).unique();
    if (!slot || slot.status !== 'pending') return false;
    await ctx.db.patch(slot._id, { status: 'running', updatedAt: Date.now() });
    await ctx.db.patch(args.runId, { status: 'running', updatedAt: Date.now() });
    return true;
  },
});

export const finishSample = internalMutation({
  args: { ...slotArgs, result: v.union(scanResult, v.null()), error: nullableString }, returns: v.null(),
  handler: async (ctx, args) => {
    const slot = await ctx.db.query('measurementSamples').withIndex('by_run_sample_engine', (q) =>
      q.eq('runId', args.runId).eq('sampleNumber', args.sampleNumber).eq('engine', args.engine)).unique();
    if (!slot || slot.status === 'succeeded' || slot.status === 'failed') return null;
    const run = await ctx.db.get(args.runId);
    if (!run) throw new Error('measurement_not_found');
    const result = args.result;
    if (result && (result.platform !== args.engine || result.sampleNumber !== args.sampleNumber || result.measurementRunId !== run.publicId)) throw new Error('sample_identity_mismatch');
    await ctx.db.patch(slot._id, { status: result ? 'succeeded' : 'failed', result,
      error: result ? null : args.error ?? 'provider_interrupted', updatedAt: Date.now() });
    if (result) {
      const value: Omit<Doc<'scans'>, '_id' | '_creationTime'> = { publicId: result.sampleId, workspaceId: run.workspaceId,
      platform: result.platform, prompt: result.prompt, response: result.response, brandMentioned: result.brandMentioned,
      brandVariants: result.brandVariants, mentionPosition: result.mentionPosition, sentiment: result.sentiment,
      sentimentScore: result.sentimentScore, sentimentReason: result.sentimentReason, competitorsMentioned: result.competitorsMentioned,
      listItems: result.listItems, analyzerConfidence: result.confidence, analyzerMethod: result.analyzerMethod ?? null,
      analyzerModel: result.analyzerModel ?? null, analyzerPromptVersion: result.analyzerPromptVersion ?? null,
      searchMode: result.searchMode ?? null, citations: result.citations.map((citation) => ({ url: citation.url, title: citation.title,
        isOwnDomain: citation.is_own_domain, provenance: citation.provenance, provider: citation.provider,
        sampleId: citation.sample_id, rawProviderReference: citation.raw_provider_reference, fetchValidation: citation.fetch_validation })),
      winner: result.winner ?? null, winnerReason: result.winnerReason ?? null, measurementRunId: run.publicId,
      measurementContractVersion: result.measurementContractVersion ?? null, sampleId: result.sampleId,
      sampleNumber: args.sampleNumber, providerModel: result.providerModel ?? null, measurementRegion: result.measurementRegion ?? null,
      measurementMode: result.measurementMode ?? null, scorerVersion: result.scorerVersion ?? null,
      failureCode: null, failureMessage: null, createdAt: Date.now() };
      const scanId = await ctx.db.insert('scans', value);
      await upsertScanMetric(ctx, scanId, value);
    }
    return null;
  },
});

export const sampleResults = internalQuery({
  args: { runId: v.id('measurementRuns'), sampleNumber: v.number() },
  returns: v.array(v.object({ engine: engineValidator, result: v.union(scanResult, v.null()), error: nullableString })),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query('measurementSamples').withIndex('by_run_sample_engine', (q) =>
      q.eq('runId', args.runId).eq('sampleNumber', args.sampleNumber)).take(4);
    return rows.map((row) => ({ engine: row.engine, result: row.result, error: row.error ?? (row.result ? null : 'provider_interrupted') }));
  },
});

export const finishRun = internalMutation({
  args: { runId: v.id('measurementRuns'), result: measurementResult, resultStorageId: v.optional(v.id('_storage')) }, returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.publicId !== args.result.runId) throw new Error('measurement_not_found');
    const slots = await ctx.db.query('measurementSamples').withIndex('by_run', (q) => q.eq('runId', run._id)).take(32);
    for (const slot of slots) if (slot.status === 'pending' || slot.status === 'running') {
      await ctx.db.patch(slot._id, { status: 'failed', error: 'provider_interrupted', updatedAt: Date.now() });
    }
    if (!run.result) {
      if (args.resultStorageId && !await ctx.db.system.get(args.resultStorageId)) throw new Error('measurement_evidence_unavailable');
      await ctx.db.patch(run._id, { result: args.result, ...(args.resultStorageId ? { resultStorageId: args.resultStorageId } : {}), status: args.result.status, updatedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.measurementAlerts.evaluate, { runId: run._id });
    }
    return null;
  },
});
