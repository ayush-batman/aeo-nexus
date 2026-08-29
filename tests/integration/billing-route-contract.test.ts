import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function routeSource(relativePath: string): Promise<string> {
  return readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('Razorpay webhook fails closed and verifies provider-owned payment data', async () => {
  const source = await routeSource('app/api/webhooks/razorpay/route.ts');

  assert.match(source, /verifyRazorpayWebhookSignature/);
  assert.match(source, /razorpay\.payments\.fetch/);
  assert.match(source, /razorpay\.orders\.fetch/);
  assert.match(source, /validateRazorpayPayment/);
  assert.match(source, /applyBillingEvent/);
  assert.doesNotMatch(source, /Processing without signature/i);
  assert.doesNotMatch(source, /notes\.plan\s*\|\|/);
  assert.doesNotMatch(source, /\.update\(\{\s*plan/);
});

test('Stripe webhook uses service-role updates and maps provider prices', async () => {
  const source = await routeSource('app/api/stripe/webhook/route.ts');

  assert.match(source, /createAdminClient/);
  assert.match(source, /subscriptions\.retrieve/);
  assert.match(source, /getStripePlanFromPrice/);
  assert.match(source, /applyBillingEvent/);
  assert.doesNotMatch(source, /@\/lib\/supabase\/server/);
  assert.doesNotMatch(source, /\.update\(\{\s*plan/);
});
