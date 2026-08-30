import { createClient, type GenericCtx } from '@convex-dev/better-auth';
import { convex } from '@convex-dev/better-auth/plugins';
import { betterAuth } from 'better-auth/minimal';
import type { BetterAuthOptions } from 'better-auth';

import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';
import authConfig from './auth.config';

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000';

export const authComponent = createClient<DataModel>(components.betterAuth);

async function sendAuthEmail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('auth_email_not_configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.AELO_AUTH_EMAIL_FROM ?? 'Aelo <auth@aelohq.com>',
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) {
    throw new Error(`auth_email_failed:${response.status}`);
  }
}

export function createAuthOptions(ctx: GenericCtx<DataModel>): BetterAuthOptions {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return {
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: 'Reset your Aelo password',
          text: `Reset your Aelo password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({
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
