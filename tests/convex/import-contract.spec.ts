/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';

import { internal } from '../../convex/_generated/api';
import schema from '../../convex/schema';

const modules = import.meta.glob('../../convex/**/*.ts');
const manifestHash = 'a'.repeat(64);

test('tenant import resolves foreign keys and is repeat-safe', async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const staged = [
    {
      sourceTable: 'organizations',
      sourcePublicId: '11111111-1111-4111-8111-111111111111',
      payload: {
        publicId: '11111111-1111-4111-8111-111111111111',
        name: 'Imported Organization',
        plan: 'pro',
        stripeCustomerId: null,
        stripeSubscriptionId: 'sub_existing',
        razorpaySubscriptionId: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      sourceTable: 'users',
      sourcePublicId: '22222222-2222-4222-8222-222222222222',
      payload: {
        publicId: '22222222-2222-4222-8222-222222222222',
        organizationPublicId: '11111111-1111-4111-8111-111111111111',
        email: 'owner@example.com',
        fullName: 'Imported Owner',
        avatarUrl: null,
        onboardingCompleted: true,
        isSuperAdmin: false,
        role: 'owner',
        createdAt: now,
      },
    },
    {
      sourceTable: 'workspaces',
      sourcePublicId: '33333333-3333-4333-8333-333333333333',
      payload: {
        publicId: '33333333-3333-4333-8333-333333333333',
        organizationPublicId: '11111111-1111-4111-8111-111111111111',
        name: 'Imported Brand',
        logoUrl: null,
        settings: { website: 'https://example.com' },
        createdAt: now,
        updatedAt: now,
      },
    },
  ];

  await t.run(async (ctx) => {
    for (const row of staged) {
      await ctx.db.insert('importStaging', { manifestHash, ...row });
    }
  });

  for (const sourceTable of ['organizations', 'users', 'workspaces'] as const) {
    const result = await t.mutation(internal.imports.materializeTenantBatch, {
      manifestHash,
      sourceTable,
      afterPublicId: null,
    });
    expect(result).toMatchObject({ processed: 1, complete: true });
  }

  for (const sourceTable of ['organizations', 'users', 'workspaces'] as const) {
    await t.mutation(internal.imports.materializeTenantBatch, {
      manifestHash,
      sourceTable,
      afterPublicId: null,
    });
  }

  const counts = await t.run(async (ctx) => ({
    organizations: (await ctx.db.query('organizations').take(10)).length,
    users: (await ctx.db.query('users').take(10)).length,
    memberships: (await ctx.db.query('memberships').take(10)).length,
    workspaces: (await ctx.db.query('workspaces').take(10)).length,
  }));
  expect(counts).toEqual({ organizations: 1, users: 1, memberships: 1, workspaces: 1 });
});

test('critical evidence, API keys, and billing events import without fabrication', async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const organizationPublicId = '11111111-1111-4111-8111-111111111111';
  const userPublicId = '22222222-2222-4222-8222-222222222222';
  const workspacePublicId = '33333333-3333-4333-8333-333333333333';
  const tenantRows = [
    {
      sourceTable: 'organizations',
      sourcePublicId: organizationPublicId,
      payload: {
        publicId: organizationPublicId,
        name: 'Organization',
        plan: 'pro',
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      sourceTable: 'users',
      sourcePublicId: userPublicId,
      payload: {
        publicId: userPublicId,
        organizationPublicId,
        email: 'owner@example.com',
        role: 'owner',
        createdAt: now,
      },
    },
    {
      sourceTable: 'workspaces',
      sourcePublicId: workspacePublicId,
      payload: {
        publicId: workspacePublicId,
        organizationPublicId,
        name: 'Brand',
        createdAt: now,
        updatedAt: now,
      },
    },
  ];
  await t.run(async (ctx) => {
    for (const row of tenantRows) {
      await ctx.db.insert('importStaging', { manifestHash, ...row });
    }
  });
  for (const sourceTable of ['organizations', 'users', 'workspaces'] as const) {
    await t.mutation(internal.imports.materializeTenantBatch, {
      manifestHash,
      sourceTable,
      afterPublicId: null,
    });
  }

  const criticalRows = [
    {
      sourceTable: 'products',
      sourcePublicId: '44444444-4444-4444-8444-444444444444',
      payload: {
        publicId: '44444444-4444-4444-8444-444444444444',
        workspacePublicId,
        name: 'Product',
        createdAt: now,
        updatedAt: now,
      },
    },
    {
      sourceTable: 'llm_scans',
      sourcePublicId: '55555555-5555-4555-8555-555555555555',
      payload: {
        publicId: '55555555-5555-4555-8555-555555555555',
        workspacePublicId,
        platform: 'gemini',
        prompt: 'Which product should I use?',
        response: 'A real stored answer',
        brandMentioned: true,
        citations: [
          { url: 'https://example.com/source', title: 'Legacy source' },
          { url: 'https://example.com/unsupported', provenance: 'provider_citation' },
          { url: 'https://example.com/mismatch', provenance: 'provider_citation', raw_provider_reference: { url: 'https://example.com/different' } },
          { url: 'https://example.com/proven', provenance: 'provider_citation', raw_provider_reference: { url: 'https://example.com/proven' } },
        ],
        createdAt: now,
      },
    },
    {
      sourceTable: 'api_keys',
      sourcePublicId: '66666666-6666-4666-8666-666666666666',
      payload: {
        publicId: '66666666-6666-4666-8666-666666666666',
        workspacePublicId,
        organizationPublicId,
        createdByPublicId: userPublicId,
        name: 'MCP',
        keyPrefix: 'alo_live_test',
        keyHash: 'f'.repeat(64),
        scopes: ['read', 'measure'],
        createdAt: now,
      },
    },
    {
      sourceTable: 'billing_webhook_events',
      sourcePublicId: '77777777-7777-4777-8777-777777777777',
      payload: {
        publicId: '77777777-7777-4777-8777-777777777777',
        organizationPublicId,
        provider: 'stripe',
        eventId: 'evt_existing',
        eventType: 'customer.subscription.updated',
        plan: 'pro',
        appliedAt: now,
      },
    },
  ];
  await t.run(async (ctx) => {
    for (const row of criticalRows) {
      await ctx.db.insert('importStaging', { manifestHash, ...row });
    }
  });
  for (const sourceTable of [
    'products',
    'llm_scans',
    'api_keys',
    'billing_webhook_events',
  ] as const) {
    await t.mutation(internal.imports.materializeCriticalBatch, {
      manifestHash,
      sourceTable,
      afterPublicId: null,
    });
    await t.mutation(internal.imports.materializeCriticalBatch, {
      manifestHash,
      sourceTable,
      afterPublicId: null,
    });
  }

  const imported = await t.run(async (ctx) => ({
    scans: await ctx.db.query('scans').take(10),
    apiKeys: await ctx.db.query('apiKeys').take(10),
    billingEvents: await ctx.db.query('billingWebhookEvents').take(10),
  }));
  expect(imported.scans).toHaveLength(1);
  expect(imported.scans[0].citations[0].provenance).toBe('unverified');
  expect(imported.scans[0].citations.map((citation) => citation.provenance))
    .toEqual(['unverified', 'unverified', 'unverified', 'provider_citation']);
  expect(imported.scans[0].analyzerMethod).toBeNull();
  expect(imported.apiKeys).toHaveLength(1);
  expect(imported.apiKeys[0].keyHash).toBe('f'.repeat(64));
  expect(imported.billingEvents).toHaveLength(1);
  expect(imported.billingEvents[0].changedOrganization).toBe(false);

  await t.run(async (ctx) => {
    await ctx.db.insert('organizations', {
      publicId: 'other-org', name: 'Other tenant', plan: 'free', stripeCustomerId: null,
      stripeSubscriptionId: null, razorpaySubscriptionId: null, createdAt: now, updatedAt: now,
    });
    const stagedKey = await ctx.db.query('importStaging')
      .withIndex('by_manifest_table_public_id', (q) => q.eq('manifestHash', manifestHash)
        .eq('sourceTable', 'api_keys')).unique();
    if (!stagedKey) throw new Error('missing_synthetic_key');
    await ctx.db.patch(stagedKey._id, { payload: { ...stagedKey.payload, organizationPublicId: 'other-org' } });
  });
  await expect(t.mutation(internal.imports.materializeCriticalBatch, {
    manifestHash, sourceTable: 'api_keys', afterPublicId: null,
  })).rejects.toThrow('import_organization_mismatch');
  await t.run(async (ctx) => {
    const user = (await ctx.db.query('users').take(1))[0];
    await ctx.db.patch(user._id, { authSubject: 'claimed', claimedAt: now, emailVerified: true });
  });
  await expect(t.mutation(internal.imports.materializeTenantBatch, {
    manifestHash, sourceTable: 'users', afterPublicId: null,
  })).rejects.toThrow('import_user_already_claimed');
});
