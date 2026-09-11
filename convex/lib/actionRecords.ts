import { v } from 'convex/values';
import type { Doc } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import { actionStatusValidator, nullableString, priorityValidator } from '../validators';
export const actionRecord = v.object({ id: v.string(), workspace_id: v.string(), owner_id: nullableString, forum_thread_id: nullableString,
  action_type: v.string(), title: v.string(), description: nullableString, action_url: nullableString, hypothesis: nullableString,
  source_url: nullableString, priority: priorityValidator, target_prompts: v.array(v.string()), target_engines: v.array(v.string()),
  insight_key: nullableString, status: actionStatusValidator, action_taken_at: nullableString,
  baseline_snapshot: v.any(), impact_snapshot: v.any(), impact_summary: v.any(), created_at: v.string(), updated_at: v.string() });
export async function serializeAction(ctx: QueryCtx | MutationCtx, row: Doc<'actions'>, workspaceId: string) {
  const owner = row.ownerId ? await ctx.db.get(row.ownerId) : null;
  const thread = row.forumThreadId ? await ctx.db.get(row.forumThreadId) : null;
  return { id: row.publicId, workspace_id: workspaceId, owner_id: owner?.publicId ?? null, forum_thread_id: thread?.publicId ?? null,
    action_type: row.actionType, title: row.title, description: row.description, action_url: row.actionUrl, hypothesis: row.hypothesis,
    source_url: row.sourceUrl, priority: row.priority, target_prompts: row.targetPrompts, target_engines: row.targetEngines,
    insight_key: row.insightKey, status: row.status, action_taken_at: row.actionTakenAt === null ? null : new Date(row.actionTakenAt).toISOString(),
    baseline_snapshot: row.baselineSnapshot, impact_snapshot: row.impactSnapshot, impact_summary: row.impactSummary,
    created_at: new Date(row.createdAt).toISOString(), updated_at: new Date(row.updatedAt).toISOString() };
}
