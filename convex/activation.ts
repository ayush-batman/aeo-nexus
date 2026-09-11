import { v } from 'convex/values';
import { tenantMutation, tenantQuery, requireRole, requireWorkspace } from './lib/tenant';
import { beginMeasurement } from './measurements';
import { configuredEngines } from './apiWrites';
import { DECISION_PACKET_VERSION } from '../lib/measurement/decision-packet';

export const begin = tenantMutation({
  args: { workspaceId: v.string(), prompts: v.array(v.string()), requestId: v.string() }, returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const prompts = args.prompts.map(p => p.trim());
    if (prompts.length < 3 || prompts.length > 5 || new Set(prompts).size !== prompts.length || prompts.some(p => !p || p.length > 500) ||
      !args.requestId || args.requestId.length > 100) throw new Error('invalid_activation');
    const existing = await ctx.db.query('decisionPackets').withIndex('by_public_id', q => q.eq('publicId', args.requestId)).unique();
    if (existing) {
      if (existing.workspaceId !== workspace._id || JSON.stringify(existing.prompts) !== JSON.stringify(prompts)) throw new Error('request_id_conflict');
      return existing.publicId;
    }
    const platforms = configuredEngines().filter(engine => ctx.tenant.organization.plan !== 'free' || engine === 'gemini');
    if (!platforms.length) throw new Error('no_engines_available');
    const packetId = await ctx.db.insert('decisionPackets', { publicId: args.requestId, workspaceId: workspace._id,
      contractVersion: DECISION_PACKET_VERSION, status: 'untracked', prompts, packet: { brandName: workspace.name },
      measurementRunIds: [], createdBy: ctx.tenant.user._id, createdAt: Date.now() });
    const runIds: string[] = [];
    const competitors = Array.isArray(workspace.settings?.competitors) ? workspace.settings.competitors.filter((c: unknown): c is string => typeof c === 'string').slice(0, 20) : [];
    for (const [index, prompt] of prompts.entries()) {
      const runId = await beginMeasurement(ctx, ctx.tenant, workspace, `activation:${args.requestId}:${index}`, {
        prompt, brandName: workspace.name, competitors, platforms, samples: 4, mode: 'standard',
        ...(typeof workspace.settings?.website === 'string' ? { brandDomain: workspace.settings.website } : {}),
      }, `activation:${args.requestId}`);
      runIds.push(runId);
      const run = await ctx.db.query('measurementRuns').withIndex('by_public_id', q => q.eq('publicId', runId)).unique();
      await ctx.db.patch(run!._id, { decisionPacketId: packetId });
      const existingPrompt = await ctx.db.query('prompts').withIndex('by_workspace_id_and_category_and_prompt', q =>
        q.eq('workspaceId', workspace._id).eq('category', 'Onboarding').eq('prompt', prompt)).first();
      if (!existingPrompt) await ctx.db.insert('prompts', { publicId: crypto.randomUUID(), workspaceId: workspace._id,
        prompt, category: 'Onboarding', isFavorite: false, aiGenerated: false, metadata: { decision_packet_id: args.requestId }, createdAt: Date.now() });
    }
    await ctx.db.patch(packetId, { measurementRunIds: runIds });
    // The explicit buyer-prompt run replaces the old automatic "What is My Brand?" job.
    const initial = await ctx.db.query('measurementJobs').withIndex('by_workspace_id_and_purpose', q => q.eq('workspaceId', workspace._id).eq('purpose', 'initial_visibility')).first();
    if (initial && ['queued', 'skipped'].includes(initial.status)) await ctx.db.patch(initial._id, { status: 'running',
      result: { decision_packet_id: args.requestId }, updatedAt: Date.now(), claimToken: null, claimExpiresAt: null });
    return args.requestId;
  },
});

export const get = tenantQuery({
  args: { workspaceId: v.string(), packetId: v.optional(v.string()) },
  returns: v.union(v.null(), v.object({ id: v.string(), brandName: v.string(), createdAt: v.string(),
    legacyPacket: v.any(), runIds: v.array(v.string()), pending: v.boolean() })),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const packet = args.packetId
      ? await ctx.db.query('decisionPackets').withIndex('by_public_id', q => q.eq('publicId', args.packetId!)).unique()
      : await ctx.db.query('decisionPackets').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc').first();
    if (!packet || packet.workspaceId !== workspace._id) return null;
    const runs = await Promise.all((packet.measurementRunIds ?? []).map(id => ctx.db.query('measurementRuns').withIndex('by_public_id', q => q.eq('publicId', id)).unique()));
    return { id: packet.publicId, brandName: typeof packet.packet?.brandName === 'string' ? packet.packet.brandName : workspace.name,
      createdAt: new Date(packet.createdAt).toISOString(), legacyPacket: packet.measurementRunIds ? null : packet.packet,
      runIds: packet.measurementRunIds ?? [], pending: runs.some(run => !run?.result) };
  },
});
