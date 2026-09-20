import { expect, test } from 'vitest';

import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';

const AS_OF = Date.UTC(2026, 8, 11, 12);

test('dashboard summary is workspace-bound and returns an honest empty state', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();

  const summary = await owner.query(api.dashboard.summary, { workspaceId: context.workspaceId, asOf: AS_OF });
  expect(summary).toMatchObject({
    status: 'complete',
    stats: { llmVisibility: null, llmVisibilitySamples: 0, forumThreadCount: 0 },
    decisionBrief: { status: 'unmeasured', competitor: null },
    recentMentions: [],
    focalAnswer: null,
    topThreads: [],
  });
  await expect(t.query(api.dashboard.summary, { workspaceId: context.workspaceId, asOf: AS_OF })).rejects.toThrow('Unauthenticated');
  await expect(owner.query(api.dashboard.summary, { workspaceId: foreignWorkspace, asOf: AS_OF })).rejects.toThrow('workspace_not_found');
});

test('dashboard summary surfaces a real omitted answer as the focal evidence sheet', async () => {
  const { t, owner, context } = await fixture();
  const createdAt = AS_OF - 60_000;
  await t.run(async (ctx) => {
    const workspace = await ctx.db.query('workspaces').withIndex('by_public_id', (q) =>
      q.eq('publicId', context.workspaceId)).unique();
    if (!workspace) throw new Error('missing_workspace');
    const scanId = await ctx.db.insert('scans', {
      publicId: 'dashboard-focal-answer', workspaceId: workspace._id, platform: 'gemini',
      prompt: 'Which visibility tool should a growing team use?',
      response: 'A buyer could compare established analytics tools and choose one that shows its evidence.',
      brandMentioned: false, brandVariants: [], mentionPosition: null, sentiment: 'neutral', sentimentScore: 0,
      sentimentReason: 'Synthetic regression fixture', competitorsMentioned: [], listItems: [], analyzerConfidence: 1,
      analyzerMethod: 'deterministic-test', analyzerModel: 'none', analyzerPromptVersion: 'test-v2', searchMode: 'test-search',
      citations: [{ url: 'https://example.test/review', title: 'Review', isOwnDomain: false,
        provenance: 'provider_citation', provider: 'gemini', sampleId: 'sample-01', rawProviderReference: {}, fetchValidation: 'not_checked' }],
      winner: null, winnerReason: null, measurementRunId: null, measurementContractVersion: 'measurement.v2',
      sampleId: 'sample-01', sampleNumber: 1, providerModel: 'gemini-test', measurementRegion: 'test', measurementMode: 'standard',
      scorerVersion: 'aelo-brand-scorer.v2', failureCode: null, failureMessage: null, createdAt,
    });
    await ctx.db.insert('scanMetrics', { scanId, workspaceId: workspace._id, prompt: 'Which visibility tool should a growing team use?',
      platform: 'gemini', measurementRunId: null, createdAt, observation: {
        prompt: 'Which visibility tool should a growing team use?', platform: 'gemini', hasEvidence: true,
        brand_mentioned: false, mention_position: null, competitors_mentioned: [], sentiment: 'neutral',
        created_at: new Date(createdAt).toISOString(), provider_model: 'gemini-test', measurement_region: 'test',
        measurement_mode: 'standard', scorer_version: 'aelo-brand-scorer.v2', measurement_contract_version: 'measurement.v2',
        search_mode: 'test-search', analyzer_method: 'deterministic-test', analyzer_model: 'none', analyzer_prompt_version: 'test-v2',
      } });
  });

  const summary = await owner.query(api.dashboard.summary, { workspaceId: context.workspaceId, asOf: AS_OF });
  expect(summary.focalAnswer).toMatchObject({
    id: 'dashboard-focal-answer', platform: 'Gemini', brandMentioned: false,
    citationCount: 1, providerModel: 'gemini-test', sampleId: 'sample-01',
  });
  expect(summary.focalAnswer?.responseExcerpt).toContain('shows its evidence');
  const laterSummary = await owner.query(api.dashboard.summary, {
    workspaceId: context.workspaceId,
    asOf: AS_OF + 8 * 86_400_000,
  });
  expect(laterSummary.focalAnswer).toBeNull();
});

test('dashboard summary returns the highest source opportunities without a second route', async () => {
  const { owner, context } = await fixture();
  await owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread: {
    platform: 'reddit', externalId: 'low', url: 'https://www.reddit.com/r/testing/comments/low', title: 'Lower opportunity', opportunityScore: 60,
  } });
  await owner.mutation(api.forum.save, { workspaceId: context.workspaceId, thread: {
    platform: 'reddit', externalId: 'high', url: 'https://www.reddit.com/r/testing/comments/high', title: 'Higher opportunity', opportunityScore: 90,
  } });

  const summary = await owner.query(api.dashboard.summary, { workspaceId: context.workspaceId, asOf: AS_OF });
  expect(summary.stats.forumThreadCount).toBe(2);
  expect(summary.topThreads[0]?.title).toBe('Higher opportunity');
});

test('dashboard bootstrap returns only the signed-in organization and honors its active workspace', async () => {
  const { owner, context, foreignWorkspace } = await fixture();
  const bootstrap = await owner.query(api.dashboard.bootstrap, { activeWorkspacePublicId: foreignWorkspace });
  expect(bootstrap).toMatchObject({
    orgId: context.orgId,
    workspaceId: context.workspaceId,
    plan: 'free',
    paid: false,
  });
  expect(bootstrap?.workspaces.every((workspace) => workspace.id !== foreignWorkspace)).toBe(true);
});
