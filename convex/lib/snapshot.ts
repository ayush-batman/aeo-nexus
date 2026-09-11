import type { Doc } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import { snapshotFromObservations } from '../../lib/interventions';
export async function snapshot(ctx: QueryCtx | MutationCtx, workspace: Doc<'workspaces'>, prompts: string[]) {
  const rows: Doc<'scanMetrics'>[] = [];
  for (const prompt of prompts) for (const engine of ['gemini', 'chatgpt', 'claude', 'perplexity'] as const) {
    rows.push(...await ctx.db.query('scanMetrics').withIndex('by_workspace_prompt_engine_created', q => q.eq('workspaceId', workspace._id)
      .eq('prompt', prompt).eq('platform', engine).gte('createdAt', Date.now() - 30 * 86400_000)).order('desc').take(8));
  }
  return snapshotFromObservations(rows.map(row => row.observation), prompts);
}
