import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';

const prompt = 'Which AI visibility tracker should a marketing team use?';

async function insertMetric(t: Awaited<ReturnType<typeof fixture>>['t'], workspaceId: string,
  mentioned: boolean, createdAt: number) {
  await t.run(async (ctx) => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', q => q.eq('publicId', workspaceId)).unique();
    if (!workspace) throw new Error('missing_workspace');
    const scanId = await ctx.db.insert('scans', {
      publicId: crypto.randomUUID(), workspaceId: workspace._id, platform: 'gemini', prompt,
      response: mentioned ? 'Aelo is one option.' : 'Another product is one option.', brandMentioned: mentioned,
      brandVariants: [], mentionPosition: mentioned ? 1 : null, sentiment: 'neutral', sentimentScore: 0,
      sentimentReason: 'Synthetic regression fixture', competitorsMentioned: [], listItems: [], analyzerConfidence: 1,
      analyzerMethod: 'deterministic-test', analyzerModel: 'none', analyzerPromptVersion: 'test-v2', searchMode: 'test-search',
      citations: [], winner: null, winnerReason: null, measurementRunId: `run-${createdAt}`,
      measurementContractVersion: 'measurement.v2', sampleId: `sample-${createdAt}`, sampleNumber: 1,
      providerModel: 'gemini-test', measurementRegion: 'test', measurementMode: 'standard',
      scorerVersion: 'aelo-brand-scorer.v2', failureCode: null, failureMessage: null, createdAt,
    });
    await ctx.db.insert('scanMetrics', { scanId, workspaceId: workspace._id, prompt, platform: 'gemini',
      measurementRunId: `run-${createdAt}`, createdAt, observation: {
        prompt, platform: 'gemini', hasEvidence: true, brand_mentioned: mentioned,
        mention_position: mentioned ? 1 : null, competitors_mentioned: [], sentiment: 'neutral',
        created_at: new Date(createdAt).toISOString(), provider_model: 'gemini-test', measurement_region: 'test',
        measurement_mode: 'standard', scorer_version: 'aelo-brand-scorer.v2', measurement_contract_version: 'measurement.v2',
        search_mode: 'test-search', analyzer_method: 'deterministic-test', analyzer_model: 'none', analyzer_prompt_version: 'test-v2',
      } });
  });
}

test('completing an action preserves its original before-state baseline', async () => {
  const { t, owner, context } = await fixture();
  const before = Date.now() - 1000;
  await insertMetric(t, context.workspaceId, false, before);
  const created = await owner.mutation(api.actions.save, { workspaceId: context.workspaceId,
    requestId: 'create-action', inputJson: JSON.stringify({ action_type: 'other', title: 'Publish evidence page',
      hypothesis: 'A provider-backed source gap is worth testing.', target_prompts: [prompt], target_engines: ['gemini'] }) });
  expect(created.baseline_snapshot[prompt].gemini).toMatchObject({ sample_count: 1, mention_count: 0 });

  await insertMetric(t, context.workspaceId, true, before + 500);
  const completed = await owner.mutation(api.actions.save, { workspaceId: context.workspaceId, id: created.id,
    requestId: 'complete-action', inputJson: JSON.stringify({ status: 'completed' }) });
  expect(completed.baseline_snapshot).toEqual(created.baseline_snapshot);
});
