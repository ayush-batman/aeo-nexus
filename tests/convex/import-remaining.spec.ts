/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';
import { internal } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { remainingImportTables, type RemainingSourceTable } from '../../convex/lib/importRecords';

const modules = import.meta.glob('../../convex/**/*.ts');
const manifestHash = 'b'.repeat(64);
const now = 1_788_048_000_000;

async function setup() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const org = await ctx.db.insert('organizations', {
      publicId: 'org', name: 'Synthetic organization', plan: 'pro',
      stripeCustomerId: null, stripeSubscriptionId: null, razorpaySubscriptionId: null,
      createdAt: now, updatedAt: now,
    });
    const workspace = await ctx.db.insert('workspaces', {
      publicId: 'workspace', organizationId: org, name: 'Brand', logoUrl: null,
      settings: {}, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert('workspaces', {
      publicId: 'other-workspace', organizationId: org, name: 'Other brand', logoUrl: null,
      settings: {}, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert('products', {
      publicId: 'product', workspaceId: workspace, name: 'Product', website: null,
      description: null, keywords: [], competitors: [], knowledgeBase: {}, createdAt: now, updatedAt: now,
    });
  });
  // Exercise the same scan importer the full import uses.
  await t.run((ctx) => ctx.db.insert('importStaging', {
    manifestHash, sourceTable: 'llm_scans', sourcePublicId: 'scan',
    payload: { publicId: 'scan', workspacePublicId: 'workspace', platform: 'gemini',
      prompt: 'Buyer prompt', response: 'Actual saved answer', brandMentioned: true, createdAt: now },
  }));
  await t.mutation(internal.imports.materializeCriticalBatch, {
    manifestHash, sourceTable: 'llm_scans', afterPublicId: null,
  });
  return t;
}

const rows: Record<RemainingSourceTable, Record<string, unknown>> = {
  prompt_library: { prompt: 'Which brand?', category: 'buyer', isFavorite: true },
  forum_threads: { productPublicId: 'product', platform: 'reddit', externalId: 'thread',
    url: 'https://example.com/thread', title: 'Buyer discussion', status: 'queued' },
  reddit_accounts: { organizationPublicId: 'org', username: 'synthetic', postsToday: 2 },
  content_analyses: { url: 'https://example.com', aeloScore: 65, readabilityScore: 70, eeatScore: 55 },
  scheduled_scans: { prompt: 'Buyer prompt', platforms: ['gemini'], frequency: 'weekly',
    nextRunAt: now + 1000, status: 'paused', updatedAt: now },
  analytics_events: { eventType: 'pageview', aiSource: 'gemini', path: '/pricing' },
  alert_preferences: { alertType: 'visibility_drop', enabled: false, updatedAt: now },
  notifications: { type: 'visibility_drop', title: 'Review evidence', message: 'Partial samples',
    dedupeKey: 'week:1', read: true },
  interventions: { forumThreadPublicId: 'forum_threads', actionType: 'forum_reply',
    title: 'Answer buyer question', status: 'measured', updatedAt: now,
    baselineSnapshot: { gemini: { sampleCount: 4 } }, impactSummary: { verdict: 'inconclusive' } },
  action_events: { actionPublicId: 'interventions', eventType: 'measured',
    fromStatus: 'completed', toStatus: 'measured', idempotencyKey: 'measure:1', changes: { samples: 4 } },
  sentiment_drift_snapshots: { prompt: 'Buyer prompt', platform: 'gemini', weekStart: '2026-08-30',
    avgSentiment: 0.5, sampleSize: 4 },
  competitor_attributes: { scanPublicId: 'scan', entityName: 'Other brand', entityType: 'competitor',
    attribute: 'price', platform: 'gemini', confidence: 0.8 },
  accuracy_claims: { scanPublicId: 'scan', claimText: 'Has a free plan', verdict: 'unverified' },
  scan_quota_reservations: { organizationPublicId: 'org', requestId: 'request', units: 4 },
  decision_packets: { contractVersion: 'decision-packet.v1', status: 'partial',
    prompts: ['Buyer prompt'], packet: { evidence: { failed: 1, successful: 3 } } },
  weekly_digest_deliveries: { weekStart: '2026-08-30', status: 'failed', itemCount: 2,
    recipientCount: 1, attemptedAt: now, lastError: 'email_unconfigured' },
  measurement_jobs: { organizationPublicId: 'org', purpose: 'initial_visibility', status: 'partial',
    attempts: 2, maxAttempts: 3, availableAt: now, result: { failed: ['claude'] },
    updatedAt: now, completedAt: now },
  experiments: { name: 'Buyer prompt test', status: 'draft', updatedAt: now },
  newsletter_subscribers: { email: 'Reader@Example.com', status: 'unsubscribed',
    unsubscribeTokenHash: 'f'.repeat(64), subscribedAt: now, unsubscribedAt: now + 1000 },
};

function payloadFor(source: RemainingSourceTable) {
  const global = ['reddit_accounts', 'scan_quota_reservations', 'newsletter_subscribers'].includes(source);
  return {
    publicId: source,
    ...(global ? {} : { workspacePublicId: 'workspace' }),
    ...(source === 'newsletter_subscribers' || source === 'weekly_digest_deliveries' ? {} : { createdAt: now }),
    ...rows[source],
  };
}

test('all remaining tables import twice without losing evidence, states, or parent links', async () => {
  const t = await setup();
  for (const source of Object.keys(rows) as RemainingSourceTable[]) {
    await t.run((ctx) => ctx.db.insert('importStaging', {
      manifestHash, sourceTable: source, sourcePublicId: source, payload: payloadFor(source),
    }));
    for (let replay = 0; replay < 2; replay++) {
      expect(await t.mutation(internal.imports.materializeRemainingBatch, {
        manifestHash, sourceTable: source, afterPublicId: null,
      })).toMatchObject({ processed: 1, complete: true });
    }
    const imported = await t.run((ctx) => ctx.db.query(remainingImportTables[source]).take(3));
    expect(imported).toHaveLength(1);
    expect(imported[0].publicId).toBe(source);
  }
  await t.run(async (ctx) => {
    const action = (await ctx.db.query('actions').take(1))[0];
    const event = (await ctx.db.query('actionEvents').take(1))[0];
    expect(event.actionId).toBe(action._id);
    expect(action.impactSummary).toEqual({ verdict: 'inconclusive' });
    expect(action.baselineSnapshot).toEqual({ gemini: { sampleCount: 4 } });
    expect((await ctx.db.query('decisionPackets').take(1))[0].packet).toEqual(rows.decision_packets.packet);
    expect((await ctx.db.query('measurementJobs').take(1))[0].status).toBe('partial');
    expect((await ctx.db.query('weeklyDigestDeliveries').take(1))[0].status).toBe('failed');
    expect((await ctx.db.query('sentimentDriftSnapshots').take(1))[0].providerModel).toBeNull();
    expect((await ctx.db.query('newsletterSubscribers').take(1))[0].normalizedEmail).toBe('reader@example.com');
  });
});

test('bad workspace links, unknown fields, and invalid states roll back the entire batch', async () => {
  for (const invalid of [
    { workspacePublicId: 'other-workspace' },
    { verdict: 'fabricated' },
    { unexpectedEvidence: 'must not be silently dropped' },
    { scanPublicId: 'missing' },
  ]) {
    const t = await setup();
    await t.run(async (ctx) => {
      for (const [id, change] of [['a', {}], ['b', invalid]] as const) {
        await ctx.db.insert('importStaging', { manifestHash, sourceTable: 'accuracy_claims', sourcePublicId: id,
          payload: { ...payloadFor('accuracy_claims'), publicId: id, ...change } });
      }
    });
    await expect(t.mutation(internal.imports.materializeRemainingBatch, {
      manifestHash, sourceTable: 'accuracy_claims', afterPublicId: null,
    })).rejects.toThrow();
    expect(await t.run((ctx) => ctx.db.query('accuracyClaims').take(2))).toHaveLength(0);
  }
});

test('bounded pages resume without skipping or duplicating saved prompts', async () => {
  const t = await setup();
  await t.run(async (ctx) => {
    for (let index = 0; index < 25; index++) {
      const publicId = String(index).padStart(4, '0');
      await ctx.db.insert('importStaging', { manifestHash, sourceTable: 'prompt_library', sourcePublicId: publicId,
        payload: { ...payloadFor('prompt_library'), publicId } });
    }
  });
  let afterPublicId: string | null = null;
  for (const processed of [10, 10, 5]) {
    const page: { processed: number; complete: boolean; nextPublicId: string | null } = await t.mutation(internal.imports.materializeRemainingBatch, {
      manifestHash, sourceTable: 'prompt_library', afterPublicId,
    });
    expect(page.processed).toBe(processed);
    expect(page.complete).toBe(processed < 10);
    afterPublicId = page.nextPublicId;
  }
  expect(await t.run((ctx) => ctx.db.query('prompts').take(26))).toHaveLength(25);
});

test('failed public scans retain null measurements and their original expiration', async () => {
  const t = await setup();
  await t.run((ctx) => ctx.db.insert('importStaging', {
    manifestHash, sourceTable: 'public_scans', sourcePublicId: 'public-scan',
    payload: { publicId: 'public-scan', platform: 'gemini', ipHash: 'hash', brandName: 'Brand',
      prompt: 'Buyer prompt', response: null, brandMentioned: null, errorMessage: 'provider_unavailable', createdAt: now },
  }));
  for (let repeat = 0; repeat < 2; repeat++) {
    await t.mutation(internal.imports.materializeCriticalBatch, {
      manifestHash, sourceTable: 'public_scans', afterPublicId: null,
    });
  }
  const scans = await t.run((ctx) => ctx.db.query('publicScans').take(2));
  expect(scans).toHaveLength(1);
  expect(scans[0]).toMatchObject({ brandMentioned: null, response: null,
    errorMessage: 'provider_unavailable', expiresAt: now + 30 * 86400000 });
});
