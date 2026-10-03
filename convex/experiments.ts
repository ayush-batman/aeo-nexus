import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';
import { requireRole, requireWorkspace, tenantMutation, tenantQuery } from './lib/tenant';
import type { Doc } from './_generated/dataModel';

const result = v.object({ id: v.string(), workspace_id: v.string(), name: v.string(), status: v.string(), hypothesis: v.union(v.string(), v.null()),
  test_questions: v.array(v.string()), control_questions: v.array(v.string()), baseline_data: v.any(), result_data: v.any(), created_at: v.string(), updated_at: v.string() });
function record(row: Doc<'experiments'>, workspaceId: string) {
  return { id: row.publicId, workspace_id: workspaceId, name: row.name, status: row.status, hypothesis: row.hypothesis,
    test_questions: row.testQuestions, control_questions: row.controlQuestions, baseline_data: row.baselineData, result_data: row.resultData,
    created_at: new Date(row.createdAt).toISOString(), updated_at: new Date(row.updatedAt).toISOString() };
}
export const list = tenantQuery({
  args: { workspaceId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(result), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const page = await ctx.db.query('experiments').withIndex('by_workspace_id_and_created_at', q => q.eq('workspaceId', workspace._id)).order('desc')
      .paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: page.page.map(row => record(row, args.workspaceId)), isDone: page.isDone, continueCursor: page.continueCursor };
  },
});
export const create = tenantMutation({
  args: { workspaceId: v.string(), name: v.string(), hypothesis: v.optional(v.string()), testQuestions: v.array(v.string()), controlQuestions: v.array(v.string()) },
  returns: result,
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const test = args.testQuestions.map(s => s.trim()), control = args.controlQuestions.map(s => s.trim());
    if (!args.name.trim() || args.name.length > 200 || (args.hypothesis?.length ?? 0) > 3000 ||
      [test, control].some(group => !group.length || group.length > 20 || group.some(s => !s || s.length > 500)) ||
      new Set([...test, ...control]).size !== test.length + control.length) throw new Error('invalid_experiment');
    const now = Date.now();
    const id = await ctx.db.insert('experiments', { publicId: crypto.randomUUID(), workspaceId: workspace._id, name: args.name.trim(), status: 'draft',
      hypothesis: args.hypothesis?.trim() || null, testQuestions: test, controlQuestions: control, baselineData: null, resultData: null, createdAt: now, updatedAt: now });
    return record((await ctx.db.get(id))!, args.workspaceId);
  },
});
export const remove = tenantMutation({
  args: { workspaceId: v.string(), id: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    requireRole(ctx.tenant, 'editor');
    const workspace = await requireWorkspace(ctx, ctx.tenant, args.workspaceId);
    const row = await ctx.db.query('experiments').withIndex('by_public_id', q => q.eq('publicId', args.id)).unique();
    if (!row || row.workspaceId !== workspace._id) throw new Error('experiment_not_found');
    await ctx.db.delete(row._id);
    return null;
  },
});
