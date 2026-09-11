/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { register } from '@convex-dev/better-auth/test';
import { register as registerWorkflow } from '@convex-dev/workflow/test';
import { register as registerLimits } from '@convex-dev/rate-limiter/test';
import { register as registerWorkpool } from '@convex-dev/workpool/test';
import { api, components } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import '../../convex/measurements';
import '../../convex/measurementActions';

const modules = import.meta.glob('../../convex/**/*.ts');

export async function fixture() {
  const t = convexTest(schema, modules);
  register(t);
  registerWorkflow(t);
  registerWorkpool(t, 'measurementWorkpool');
  registerLimits(t);
  const now = Date.now();
  const authUser = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'user', data: { email: 'local-owner@example.test', name: 'Local owner',
      emailVerified: true, createdAt: now, updatedAt: now } },
  });
  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: { model: 'session', data: { userId: authUser._id, token: 'synthetic-test-session',
      expiresAt: now + 86400_000, createdAt: now, updatedAt: now } },
  });
  const owner = t.withIdentity({ subject: authUser._id, sessionId: session._id });
  await owner.mutation(api.users.provisionCurrentUser, {});
  const context = await owner.query(api.users.workspaceContext, { activeWorkspacePublicId: null });
  if (!context) throw new Error('missing_fixture_context');
  const foreignWorkspace = await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert('organizations', { publicId: 'foreign-org', name: 'Foreign',
      plan: 'pro', stripeCustomerId: null, stripeSubscriptionId: null, razorpaySubscriptionId: null,
      createdAt: now, updatedAt: now });
    await ctx.db.insert('workspaces', { publicId: 'foreign-workspace', organizationId, name: 'Private',
      logoUrl: null, settings: {}, createdAt: now, updatedAt: now });
    return 'foreign-workspace';
  });
  return { t, owner, context, foreignWorkspace, session };
}
