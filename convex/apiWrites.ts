import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { requireKey } from './apiKeys';
import { newPublicId } from './lib/publicIds';
import { beginMeasurement } from './measurements';
import { measurementResult } from './lib/measurementContract';
import { engineValidator, measurementModeValidator } from './validators';

export function configuredEngines() {
  return [
    { engine: 'gemini' as const, configured: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) },
    { engine: 'chatgpt' as const, configured: Boolean(process.env.OPENAI_API_KEY || (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT)) },
    { engine: 'claude' as const, configured: Boolean(process.env.ANTHROPIC_API_KEY) },
    { engine: 'perplexity' as const, configured: Boolean(process.env.PERPLEXITY_API_KEY) },
  ].filter((row) => row.configured).map((row) => row.engine);
}

export const trackPrompt = internalMutation({
  args: { keyId: v.string(), prompt: v.string() },
  returns: v.object({ id: v.string(), prompt: v.string(), category: v.string(), created_at: v.string() }),
  handler: async (ctx, args) => {
    const { workspace } = await requireKey(ctx, args.keyId, 'measure');
    const prompt = args.prompt.trim();
    if (!prompt || prompt.length > 2000) throw new Error('invalid_prompt');
    const publicId = newPublicId();
    const now = Date.now();
    await ctx.db.insert('prompts', { publicId, workspaceId: workspace._id, prompt, category: 'General',
      isFavorite: false, aiGenerated: false, metadata: {}, createdAt: now });
    return { id: publicId, prompt, category: 'General', created_at: new Date(now).toISOString() };
  },
});

export const beginScan = internalMutation({
  args: { keyId: v.string(), requestId: v.string(), prompt: v.string(), brandName: v.string(),
    brandDomain: v.optional(v.string()), competitors: v.optional(v.array(v.string())), samples: v.number(),
    platforms: v.optional(v.array(engineValidator)), mode: measurementModeValidator }, returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const { workspace, tenant } = await requireKey(ctx, args.keyId, 'measure');
    const existing = await ctx.db.query('measurementRuns').withIndex('by_organization_request', (q) =>
      q.eq('organizationId', tenant.organization._id).eq('requestId', args.requestId)).unique();
    if (existing) throw new Error('request_id_conflict');
    const configured = configuredEngines();
    const entitled = configured.filter((engine) => tenant.organization.plan !== 'free' || engine === 'gemini');
    const platforms = args.platforms ?? entitled;
    if (!platforms.length || platforms.some((engine) => !configured.some((available) => available === engine))) throw new Error('no_engines_available');
    return beginMeasurement(ctx, tenant, workspace, args.requestId, { prompt: args.prompt, brandName: args.brandName,
      brandDomain: args.brandDomain, competitors: args.competitors ?? (Array.isArray(workspace.settings?.competitors) ? workspace.settings.competitors : []),
      samples: args.samples, platforms, mode: args.mode });
  },
});

export const scanResult = internalQuery({
  args: { keyId: v.string(), runId: v.string() }, returns: v.union(measurementResult, v.null(), v.object({ storageUrl: v.string(), runId: v.string() })),
  handler: async (ctx, args) => {
    const { workspace } = await requireKey(ctx, args.keyId, 'measure');
    const run = await ctx.db.query('measurementRuns').withIndex('by_public_id', (q) => q.eq('publicId', args.runId)).unique();
    if (!run || run.workspaceId !== workspace._id) throw new Error('workspace_not_found');
    if (run.resultStorageId) {
      const storageUrl = await ctx.storage.getUrl(run.resultStorageId);
      if (!storageUrl) throw new Error('measurement_evidence_unavailable');
      return { storageUrl, runId: run.publicId };
    }
    return run.result;
  },
});

export const schedule = internalMutation({
  args: { keyId: v.string(), prompt: v.string(), platforms: v.optional(v.array(engineValidator)), competitors: v.array(v.string()),
    frequency: v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly')) },
  returns: v.object({ id: v.string(), workspace_id: v.string(), prompt: v.string(), platforms: v.array(engineValidator),
    competitors: v.array(v.string()), frequency: v.string(), status: v.literal('active'), next_run_at: v.string(), created_at: v.string() }),
  handler: async (ctx, args) => {
    const { workspace, tenant } = await requireKey(ctx, args.keyId, 'measure');
    if (!args.prompt.trim() || args.prompt.length > 2000 || args.competitors.length > 20 || args.competitors.some((value) => !value.trim() || value.length > 100)) throw new Error('invalid_schedule');
    const configured = configuredEngines();
    const entitled = configured.filter((engine) => tenant.organization.plan !== 'free' || engine === 'gemini');
    const platforms = args.platforms ?? entitled;
    if (!platforms.length) throw new Error('no_engines_available');
    if (platforms.some((engine) => !entitled.some((allowed) => allowed === engine))) throw new Error('api_scope_denied');
    const now = Date.now();
    const id = newPublicId();
    await ctx.db.insert('scheduledScans', { publicId: id, workspaceId: workspace._id, prompt: args.prompt.trim(), platforms,
      competitors: args.competitors, frequency: args.frequency, status: 'active', lastRunAt: null, nextRunAt: now,
      claimToken: null, claimExpiresAt: null, lastRunStatus: null, createdAt: now, updatedAt: now });
    return { id, workspace_id: workspace.publicId, prompt: args.prompt.trim(), platforms, competitors: args.competitors,
      frequency: args.frequency, status: 'active' as const, next_run_at: new Date(now).toISOString(), created_at: new Date(now).toISOString() };
  },
});
