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
    recentMentions: [],
    topThreads: [],
  });
  await expect(t.query(api.dashboard.summary, { workspaceId: context.workspaceId, asOf: AS_OF })).rejects.toThrow('Unauthenticated');
  await expect(owner.query(api.dashboard.summary, { workspaceId: foreignWorkspace, asOf: AS_OF })).rejects.toThrow('workspace_not_found');
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
