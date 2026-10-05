import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function routeSource(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('Razorpay bills through subscriptions and trusts only provider-fetched subscription state', async () => {
const [edge, backend] = await Promise.all([routeSource('app/api/webhooks/razorpay/route.ts'),routeSource('convex/billingActions.ts')]);
  assert.match(edge, /internal\.billingActions\.razorpayWebhook/);
  assert.match(edge, /x-razorpay-event-id/);
  assert.match(backend, /verifyRazorpayWebhookSignature/);
  assert.match(backend, /provider\.subscriptions\.create/); assert.match(backend, /provider\.subscriptions\.fetch/);
  assert.match(backend, /validateRazorpayPlanDefinition/); assert.match(backend, /resolveRazorpaySubscription/);
  assert.match(backend, /internal\.billing\.applyVerifiedEvent/);
  // One-time orders granted a monthly plan forever; they must not come back.
  assert.doesNotMatch(backend, /orders\.create|validateRazorpayPayment/);
  assert.match(backend, /error\.message === 'invalid_subscription'\) return \{ received: true, ignored: true \}/);
  assert.doesNotMatch(backend, /Processing without signature|notes\.plan\s*\|\|/);
});

test('Stripe webhook uses service-role updates and maps provider prices', async () => {
const [edge, backend, ledger] = await Promise.all([routeSource('app/api/stripe/webhook/route.ts'), routeSource('convex/billingActions.ts'), routeSource('convex/billing.ts')]);
  assert.match(edge, /internal\.billingActions\.stripeWebhook/);
  assert.match(backend, /webhooks\.constructEvent/); assert.match(backend, /subscriptions\.retrieve/);
  assert.match(backend, /getStripePlanFromPrice/); assert.match(backend, /internal\.billing\.applyVerifiedEvent/);
  assert.match(ledger, /export const applyVerifiedEvent = internalMutation/);
});

test('successful client checkout reloads server-owned billing state', async () => {
  const checkout = await routeSource('components/billing/checkout-button.tsx');
  assert.match(checkout, /if \(v\.ok\)[\s\S]*location\.assign\(new URL\(["']\/dashboard\?upgraded=1["']/);
});
