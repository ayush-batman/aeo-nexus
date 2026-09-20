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
