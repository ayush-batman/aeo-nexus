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
