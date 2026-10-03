import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth/minimal';
import type { BetterAuthOptions } from 'better-auth';

import { components, internal } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';
import { consumeAuthLimit } from './lib/authLimit';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';
const trustedOrigins = Array.from(
  new Set(
    [siteUrl, ...(process.env.AUTH_TRUSTED_ORIGINS ?? '').split(',')]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

export const authComponent = createClient<DataModel>(components.betterAuth);

async function sendAuthEmail(ctx: GenericCtx<DataModel>, input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!('runAction' in ctx)) throw new Error('auth_action_required');
  await ctx.runAction(internal.authActions.sendEmail, input);
}

export function createAuthOptions(ctx: GenericCtx<DataModel>): BetterAuthOptions {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return {
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    secret: process.env.BETTER_AUTH_SECRET,
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        // This session-protected bridge is called by every server-side Convex
        // request. Credential-attempt limits below must not throttle it.
        '/convex/token': false,
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 60, max: 5 },
        '/send-verification-email': { window: 60, max: 5 },
      },
      customStorage: {
        // Better Auth 1.6.15 uses consume, which checks and increments atomically.
        // Fail closed if a dependency change ever attempts its unsafe read/write fallback.
        get: async () => { throw new Error('atomic_auth_limiter_required'); },
        set: async () => { throw new Error('atomic_auth_limiter_required'); },
        consume: async (key, rule) => {
          if (!('runMutation' in ctx)) throw new Error('auth_action_required');
          return consumeAuthLimit(ctx, { key, window: rule.window, max: rule.max });
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail(ctx, {
          to: user.email,
          subject: 'Reset your Aelo password',
          text: `Reset your Aelo password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail(ctx, {
          to: user.email,
          subject: 'Verify your Aelo email',
          text: `Verify your Aelo email: ${url}`,
        });
      },
    },
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : undefined,
    plugins: [convex({ authConfig })],
  };
}

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));
