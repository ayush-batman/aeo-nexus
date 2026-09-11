import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Doc } from './_generated/dataModel';
import { tenantMutation, tenantQuery, requireRole, requireWorkspace } from './lib/tenant';
import { actionRecord, serializeAction } from './lib/actionRecords';
import { snapshot } from './lib/snapshot';
import { normalizeActionInput, canTransitionAction } from '../lib/actions';
import { actionStatusValidator, nullableString } from './validators';

export const list = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(actionRecord), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('actions').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    return { page: await Promise.all(result.page.map(row => serializeAction(ctx, row, workspace.publicId))), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const get = tenantQuery({
  args: { workspaceId: v.string(), id: v.string() }, returns: actionRecord,
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('actions').withIndex('by_public_id', q => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('action_not_found');
    return serializeAction(ctx, row, args.workspaceId);
  },
});
export const events = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.string(), action_id: v.string(), workspace_id: v.string(), actor_id: nullableString,
    event_type: v.string(), from_status: v.union(actionStatusValidator, v.null()), to_status: v.union(actionStatusValidator, v.null()),
    changes: v.any(), idempotency_key: v.string(), created_at: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const result = await ctx.db.query('actionEvents').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, args.paginationOpts.numItems) });
    const page = await Promise.all(result.page.map(async row => {
      const action = await ctx.db.get(row.actionId), actor = row.actorId ? await ctx.db.get(row.actorId) : null;
      if (!action || action.workspaceId !== workspace._id) throw new Error('action_not_found');
      return { id: row.publicId, action_id: action.publicId, workspace_id: workspace.publicId, actor_id: actor?.publicId ?? null,
        event_type: row.eventType, from_status: row.fromStatus, to_status: row.toStatus, changes: row.changes,
        idempotency_key: row.idempotencyKey, created_at: new Date(row.createdAt).toISOString() };
    }));
    return { page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const save = tenantMutation({
  args: { workspaceId: v.string(), id: v.optional(v.string()), inputJson: v.string(), requestId: v.string() }, returns: actionRecord,
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    if (args.inputJson.length > 20000 || !args.requestId || args.requestId.length > 180) throw new Error('invalid_action');
    let raw: Record<string, unknown>;
    try { raw = JSON.parse(args.inputJson); if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(); } catch { throw new Error('invalid_action'); }
    const existing = args.id ? await ctx.db.query('actions').withIndex('by_public_id', q => q.eq('publicId', args.id!)).unique() : null;
    if (args.id && (!existing || existing.workspaceId !== workspace._id)) throw new Error('action_not_found');
    if (existing && await ctx.db.query('actionMeasurements').withIndex('by_action_status', q => q.eq('actionId', existing._id).eq('status', 'running')).first()) throw new Error('action_measurement_running');
    const saved = existing ? await serializeAction(ctx, existing, workspace.publicId) : null;
    const normalized = (() => {
      try { return normalizeActionInput({ ...saved, ...raw, insight_key: existing ? existing.insightKey : raw.insight_key,
        hypothesis: raw.hypothesis ?? saved?.hypothesis ?? raw.description ?? raw.title,
        owner_id: raw.owner_id === null ? null : raw.owner_id ?? saved?.owner_id ?? ctx.tenant.user.publicId }); }
      catch { throw new Error('invalid_action'); }
    })();
    if (existing && !canTransitionAction(existing.status, normalized.status)) throw new Error('invalid_action_transition');
    if (normalized.target_engines.some(engine => !['gemini', 'chatgpt', 'claude', 'perplexity'].includes(engine))) throw new Error('invalid_action_engine');
    const targetEngines = normalized.target_engines as Array<'gemini' | 'chatgpt' | 'claude' | 'perplexity'>;
    const owner = normalized.owner_id ? await ctx.db.query('users').withIndex('by_public_id', q => q.eq('publicId', normalized.owner_id!)).unique() : null;
    if (normalized.owner_id && (!owner || !await ctx.db.query('memberships').withIndex('by_organization_id_and_user_id', q => q.eq('organizationId', ctx.tenant.organization._id).eq('userId', owner._id)).unique())) throw new Error('invalid_action_owner');
    const actionType = existing?.actionType ?? raw.action_type;
    if (typeof actionType !== 'string' || !['forum_reply', 'content_publish', 'content_update', 'schema_add', 'backlink_earned', 'llms_txt_update', 'other'].includes(actionType)) throw new Error('invalid_action_type');
    if (!existing && normalized.insight_key) {
      const promoted = await ctx.db.query('actions').withIndex('by_workspace_id_and_insight_key', q => q.eq('workspaceId', workspace._id).eq('insightKey', normalized.insight_key)).unique();
      if (promoted) return serializeAction(ctx, promoted, workspace.publicId);
    }
    const duplicate = await ctx.db.query('actionEvents').withIndex('by_workspace_request', q => q.eq('workspaceId', workspace._id).eq('idempotencyKey', args.requestId)).unique();
    if (duplicate) {
      const prior = await ctx.db.get(duplicate.actionId);
      if (!prior || (args.id && prior.publicId !== args.id)) throw new Error('request_id_conflict');
      return serializeAction(ctx, prior, workspace.publicId);
    }
    const completing = normalized.status === 'completed' && existing?.status !== 'completed';
    const baseline = !existing || completing ? await snapshot(ctx, workspace, normalized.target_prompts) : existing.baselineSnapshot;
    const now = Date.now();
    const value: Omit<Doc<'actions'>, '_id' | '_creationTime'> = { publicId: existing?.publicId ?? crypto.randomUUID(), workspaceId: workspace._id,
      ownerId: owner?._id ?? null, forumThreadId: existing?.forumThreadId ?? null, actionType, title: normalized.title,
      description: normalized.description, actionUrl: normalized.action_url, hypothesis: normalized.hypothesis, sourceUrl: normalized.source_url,
      priority: normalized.priority, targetPrompts: normalized.target_prompts, targetEngines, insightKey: normalized.insight_key,
      status: normalized.status, actionTakenAt: completing ? now : existing?.actionTakenAt ?? null,
      baselineSnapshot: baseline, impactSnapshot: existing?.impactSnapshot ?? null, impactSummary: existing?.impactSummary ?? null,
      createdAt: existing?.createdAt ?? now, updatedAt: now };
    const id = existing?._id ?? await ctx.db.insert('actions', value);
    if (existing) await ctx.db.replace(id, value);
    await ctx.db.insert('actionEvents', { publicId: crypto.randomUUID(), actionId: id, workspaceId: workspace._id,
      actorId: ctx.tenant.user._id, eventType: !existing ? 'created' : existing.status === normalized.status ? 'updated' : 'status_changed',
      fromStatus: existing?.status ?? null, toStatus: value.status, changes: normalized, idempotencyKey: args.requestId, createdAt: now });
    return serializeAction(ctx, { ...value, _id: id, _creationTime: existing?._creationTime ?? now }, workspace.publicId);
  },
});
