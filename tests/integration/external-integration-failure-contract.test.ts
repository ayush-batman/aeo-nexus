import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('Google sign-in status comes from the backend that owns the OAuth credentials', async () => {
  const [route, providerStatus, authConfig, loginPage, signupPage] = await Promise.all([
    source('app/api/auth/providers/route.ts'),
    source('convex/authProviders.ts'),
    source('convex/auth.ts'),
    source('app/(auth)/login/page.tsx'),
    source('app/(auth)/signup/page.tsx'),
  ]);
  assert.match(route, /api\.authProviders\.status/);
  assert.doesNotMatch(route, /GOOGLE_CLIENT_SECRET/);
  assert.match(route, /let google = false/);
  assert.match(providerStatus, /GOOGLE_CLIENT_ID/);
  assert.match(providerStatus, /GOOGLE_CLIENT_SECRET/);
  assert.match(authConfig, /googleClientId && googleClientSecret/);
  assert.match(authConfig, /AUTH_TRUSTED_ORIGINS/);
  assert.match(authConfig, /trustedOrigins,/);
  assert.match(authConfig, /socialProviders:/);
  assert.match(authConfig, /google:/);
  assert.match(loginPage, /GoogleSignInButton/);
  assert.match(signupPage, /GoogleSignInButton/);
});

test('email signup is not offered when the backend cannot send verification mail', async () => {
  const [route, providerStatus, signupPage] = await Promise.all([
    source('app/api/auth/providers/route.ts'),
    source('convex/authProviders.ts'),
    source('app/(auth)/signup/page.tsx'),
  ]);
  assert.match(providerStatus, /RESEND_API_KEY && process\.env\.AELO_AUTH_EMAIL_FROM/);
  assert.match(route, /\{ google, email \}/);
  assert.match(signupPage, /Email signup is unavailable right now/);
  assert.match(signupPage, /disabled=\{loading \|\| emailAvailable !== true\}/);
});

test('missing provider configuration is represented as an unavailable state, never success', async () => {
  const [scanner, scanRoute, mailAction, billing, contactRoute, contactPage] = await Promise.all([
    source('lib/ai/llm-scanner.ts'),
    source('app/api/llm/scan/route.ts'),
    source('convex/mailActions.ts'),
    source('convex/billingActions.ts'),
    source('app/api/contact/route.ts'),
    source('app/(marketing)/contact/page.tsx'),
  ]);
  assert.match(scanner, /provider_not_configured/);
  assert.match(scanRoute, /no_engines_available/);
  assert.match(scanRoute, /status: 503/);
  assert.match(mailAction, /email_not_configured/);
  assert.match(mailAction, /email_provider_unconfirmed/);
  assert.match(billing, /payment_unconfigured/);
  assert.match(billing, /payment_checkout_failed/);
  assert.match(contactRoute, /RateLimitExceededError/);
  assert.match(contactRoute, /Contact delivery is not configured/);
  assert.match(contactRoute, /status: 503/);
  assert.doesNotMatch(contactRoute, /console\.(?:log|warn|error)/);
  assert.match(contactPage, /setState\("error"\)/);
  assert.doesNotMatch(contactPage, /pretend it succeeded|would send/);
});

test('public trust pages describe the active Convex runtime rather than the retired Supabase runtime', async () => {
  const pages = await Promise.all([
    source('app/(marketing)/privacy/page.tsx'),
    source('app/(marketing)/security/page.tsx'),
    source('app/(marketing)/solutions/agencies/page.tsx'),
    source('app/(marketing)/solutions/india/page.tsx'),
  ]);
  const copy = pages.join('\n');
  assert.match(copy, /Convex/);
  assert.doesNotMatch(copy, /Supabase|Postgres RLS|AWS Mumbai/);
});
