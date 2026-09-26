/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { register } from '@convex-dev/better-auth/test';
import { expect, test } from 'vitest';

import { api, components } from '../../convex/_generated/api';
import schema from '../../convex/schema';

const modules = import.meta.glob('../../convex/**/*.ts');

test('provisions the configured owner email as a super-admin on first login', async () => {
  const t = convexTest(schema, modules);
  register(t);
  const now = Date.now();
  const authUser = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'user', data: { email: 'work.ayushg@gmail.com', name: 'Ayush',
      emailVerified: true, createdAt: now, updatedAt: now } },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'session', data: { userId: authUser._id, token: 'owner-session',
      expiresAt: now + 86400_000, createdAt: now, updatedAt: now } },
  });
  const owner = t.withIdentity({ subject: authUser._id, sessionId: session._id });
  await owner.mutation(api.users.provisionCurrentUser, {});
  const user = await t.run((ctx) => ctx.db.query('users').withIndex('by_normalized_email',
    (q) => q.eq('normalizedEmail', 'work.ayushg@gmail.com')).unique());
  expect(user?.isSuperAdmin).toBe(true);
});

test('unverified owner email cannot elevate an existing account', async () => {
  const t = convexTest(schema, modules);
  register(t);
  const now = Date.now();
  const authUser = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'user', data: { email: 'work.ayushg@gmail.com', name: 'Ayush',
      emailVerified: false, createdAt: now, updatedAt: now } },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'session', data: { userId: authUser._id, token: 'unverified-owner-session',
      expiresAt: now + 86400_000, createdAt: now, updatedAt: now } },
  });
  await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert('organizations', { publicId: 'unverified-org', name: 'Test', plan: 'free',
      stripeCustomerId: null, stripeSubscriptionId: null, razorpaySubscriptionId: null, createdAt: now, updatedAt: now });
    const userId = await ctx.db.insert('users', { publicId: 'unverified-user', authSubject: authUser._id,
      email: 'work.ayushg@gmail.com', normalizedEmail: 'work.ayushg@gmail.com', emailVerified: false,
      fullName: null, avatarUrl: null, onboardingCompleted: false, isSuperAdmin: false,
      legacySupabaseId: null, claimedAt: now, createdAt: now, updatedAt: now });
    await ctx.db.insert('memberships', { publicId: 'unverified-membership', organizationId, userId,
      role: 'owner', createdAt: now, updatedAt: now });
  });
  const owner = t.withIdentity({ subject: authUser._id, sessionId: session._id });
  await owner.mutation(api.users.provisionCurrentUser, {});
  const user = await t.run((ctx) => ctx.db.query('users').withIndex('by_auth_subject',
    (q) => q.eq('authSubject', authUser._id)).unique());
  expect(user?.isSuperAdmin).toBe(false);
});

test('verified owner email gains admin when claiming its imported account', async () => {
  const t = convexTest(schema, modules);
  register(t);
  const now = Date.now();
  const authUser = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'user', data: { email: 'work.ayushg@gmail.com', name: 'Ayush',
      emailVerified: true, createdAt: now, updatedAt: now } },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'session', data: { userId: authUser._id, token: 'imported-owner-session',
      expiresAt: now + 86400_000, createdAt: now, updatedAt: now } },
  });
  await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert('organizations', { publicId: 'imported-org', name: 'Test', plan: 'free',
      stripeCustomerId: null, stripeSubscriptionId: null, razorpaySubscriptionId: null, createdAt: now, updatedAt: now });
    const userId = await ctx.db.insert('users', { publicId: 'imported-user', authSubject: null,
      email: 'work.ayushg@gmail.com', normalizedEmail: 'work.ayushg@gmail.com', emailVerified: false,
      fullName: null, avatarUrl: null, onboardingCompleted: false, isSuperAdmin: false,
      legacySupabaseId: null, claimedAt: null, createdAt: now, updatedAt: now });
    await ctx.db.insert('memberships', { publicId: 'imported-membership', organizationId, userId,
      role: 'owner', createdAt: now, updatedAt: now });
  });
  const owner = t.withIdentity({ subject: authUser._id, sessionId: session._id });
  await owner.mutation(api.users.provisionCurrentUser, {});
  const user = await t.run((ctx) => ctx.db.query('users').withIndex('by_normalized_email',
    (q) => q.eq('normalizedEmail', 'work.ayushg@gmail.com')).unique());
  expect(user?.isSuperAdmin).toBe(true);
  expect(user?.authSubject).toBe(authUser._id);
});
