import { expect, test } from 'vitest';
import { api } from '../../convex/_generated/api';
import { fixture } from './fixtures';

test('analytics pages exact workspace and date-window summaries without generated answer payloads', async () => {
  const { t, owner, context, foreignWorkspace } = await fixture();
  await t.run(async (ctx) => {
    const workspace = await ctx.db.query('workspaces')
      .withIndex('by_public_id', (q) => q.eq('publicId', context.workspaceId)).unique();
    if (!workspace) throw new Error('missing_test_workspace');
    const base = {
      workspaceId: workspace._id, platform: 'gemini' as const, prompt: 'Which brand?',
      response: 'full answer must never cross the analytics boundary',
      brandMentioned: true, brandVariants: [], mentionPosition: 1,
      sentiment: 'positive' as const, sentimentScore: null, sentimentReason: null,
      competitorsMentioned: ['Another brand'], listItems: [], analyzerConfidence: null,
      analyzerMethod: null, analyzerModel: null, winner: null, winnerReason: null,
      measurementRunId: null, measurementContractVersion: null, sampleNumber: null,
      providerModel: null, measurementRegion: null, measurementMode: null,
      scorerVersion: null, failureCode: null, failureMessage: null,
      citations: [{ url: 'https://publisher.example/story', title: 'Story',
        isOwnDomain: false, provenance: 'provider_citation' as const, provider: 'gemini',
        sampleId: 'sample-1', rawProviderReference: { secretEvidence: 'raw-provider-payload' },
        fetchValidation: 'valid' as const }],
    };
    await ctx.db.insert('scans', { ...base, publicId: 'too-old', createdAt: 99 });
    for (let index = 0; index < 61; index++) {
      await ctx.db.insert('scans', { ...base, publicId: `sample-${index}`,
        createdAt: 100 + index, failureCode: index === 3 ? 'provider_failed' : null });
    }
    await ctx.db.insert('scans', { ...base, publicId: 'after-window', createdAt: 161 });
  });

  const input = { workspaceId: context.workspaceId, since: 100, before: 161,
    paginationOpts: { numItems: 100, cursor: null } };
  const first = await owner.query(api.records.analyticsScans, input);
  expect(first.page).toHaveLength(50);
  expect(first.isDone).toBe(false);
  const second = await owner.query(api.records.analyticsScans, {
    ...input, paginationOpts: { numItems: 100, cursor: first.continueCursor },
  });
  expect(second.page).toHaveLength(11);
  expect(second.isDone).toBe(true);
  const rows = [...first.page, ...second.page];
  expect(new Set(rows.map((row) => row.id)).size).toBe(61);
  expect(rows.find((row) => row.id === 'sample-3')?.failure_code).toBe('provider_failed');
  expect(rows[0]?.citations[0]).toEqual({ url: 'https://publisher.example/story',
    is_own_domain: false, provenance: 'provider_citation' });
  expect(JSON.stringify(rows)).not.toContain('full answer must never cross');
  expect(JSON.stringify(rows)).not.toContain('raw-provider-payload');
  await expect(t.query(api.records.analyticsScans, input)).rejects.toThrow('Unauthenticated');
  await expect(owner.query(api.records.analyticsScans, { ...input, workspaceId: foreignWorkspace }))
    .rejects.toThrow('workspace_not_found');
});
