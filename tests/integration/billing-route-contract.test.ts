import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function routeSource(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('Razorpay webhook fails closed and verifies provider-owned payment data', async () => {
const [edge, backend] = await Promise.all([routeSource('app/api/webhooks/razorpay/route.ts'),routeSource('convex/billingActions.ts')]);
  assert.match(edge, /internal\.billingActions\.razorpayWebhook/);
  assert.match(backend, /verifyRazorpayWebhookSignature/);
  assert.match(backend, /provider\.payments\.fetch/); assert.match(backend, /provider\.orders\.fetch/);
  assert.match(backend, /validateRazorpayPayment/); assert.match(backend, /internal\.billing\.applyVerifiedEvent/);
  assert.doesNotMatch(backend, /Processing without signature|notes\.plan\s*\|\|/);
});

test('Stripe webhook uses service-role updates and maps provider prices', async () => {
const [edge, backend, ledger] = await Promise.all([routeSource('app/api/stripe/webhook/route.ts'), routeSource('convex/billingActions.ts'), routeSource('convex/billing.ts')]);
  assert.match(edge, /internal\.billingActions\.stripeWebhook/);
  assert.match(backend, /webhooks\.constructEvent/); assert.match(backend, /subscriptions\.retrieve/);
  assert.match(backend, /getStripePlanFromPrice/); assert.match(backend, /internal\.billing\.applyVerifiedEvent/);
  assert.match(ledger, /export const applyVerifiedEvent = internalMutation/);
});
