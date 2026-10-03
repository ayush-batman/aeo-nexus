/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { expect, test } from 'vitest';

import type { Doc } from '../../convex/_generated/dataModel';
import { requireWorkspace, type TenantContext } from '../../convex/lib/tenant';
import schema from '../../convex/schema';

const modules = import.meta.glob('../../convex/**/*.ts');

async function seedTwoOrganizations() {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const now = Date.now();
    const organizationAId = await ctx.db.insert('organizations', {
      publicId: '11111111-1111-4111-8111-111111111111',
      name: 'Organization A',
      plan: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      razorpaySubscriptionId: null,
      createdAt: now,
      updatedAt: now,
    });
    const organizationBId = await ctx.db.insert('organizations', {
      publicId: '22222222-2222-4222-8222-222222222222',
      name: 'Organization B',
      plan: 'free',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      razorpaySubscriptionId: null,
      createdAt: now,
      updatedAt: now,
    });
    const userId = await ctx.db.insert('users', {
      publicId: '33333333-3333-4333-8333-333333333333',
      authSubject: 'auth-user-a',
      email: 'owner@example.com',
      normalizedEmail: 'owner@example.com',
      emailVerified: true,
      fullName: 'Owner',
      avatarUrl: null,
      onboardingCompleted: false,
      isSuperAdmin: false,
      legacySupabaseId: null,
      claimedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const membershipId = await ctx.db.insert('memberships', {
      publicId: '44444444-4444-4444-8444-444444444444',
      organizationId: organizationAId,
      userId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('workspaces', {
      publicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      organizationId: organizationAId,
      name: 'Workspace A',
      logoUrl: null,
      settings: {},
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('workspaces', {
      publicId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      organizationId: organizationBId,
      name: 'Workspace B',
      logoUrl: null,
      settings: {},
      createdAt: now,
      updatedAt: now,
    });

    const user = await ctx.db.get(userId);
    const membership = await ctx.db.get(membershipId);
    const organization = await ctx.db.get(organizationAId);
    if (!user || !membership || !organization) throw new Error('seed_failed');
    return { user, membership, organization };
  });

  return { t, seeded };
}

test('workspace lookup permits the member organization', async () => {
  const { t, seeded } = await seedTwoOrganizations();
  const tenant: TenantContext = {
    user: seeded.user as Doc<'users'>,
    membership: seeded.membership as Doc<'memberships'>,
    organization: seeded.organization as Doc<'organizations'>,
    role: seeded.membership.role,
  };

  const workspace = await t.query((ctx) =>
    requireWorkspace(ctx, tenant, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  );
  expect(workspace.name).toBe('Workspace A');
});

test('workspace lookup hides a different organization', async () => {
  const { t, seeded } = await seedTwoOrganizations();
  const tenant: TenantContext = {
    user: seeded.user as Doc<'users'>,
    membership: seeded.membership as Doc<'memberships'>,
    organization: seeded.organization as Doc<'organizations'>,
    role: seeded.membership.role,
  };

  await expect(
    t.query((ctx) =>
      requireWorkspace(ctx, tenant, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
    ),
  ).rejects.toThrow('workspace_not_found');
});
