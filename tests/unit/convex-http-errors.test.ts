import assert from 'node:assert/strict';
import test from 'node:test';
import { convexRouteError } from '../../lib/convex/http';

test('unconfigured checkout gives a clear safe failure without exposing backend details', async () => {
  const response = convexRouteError(new Error('[CONVEX A(billingActions:razorpayOrder)] payment_unconfigured'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Checkout is temporarily unavailable. No charge was made.' });
});

test('invalid public scans are client errors, not retryable outages', async () => {
  const response = convexRouteError(new Error('[CONVEX M(publicScans:reserve)] invalid_public_scan'));
  assert.equal(response.status, 400);
});

test('missing engine configuration says retrying will not help', async () => {
  const response = convexRouteError(new Error('[CONVEX M(activation:begin)] no_engines_available'));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Retrying will not help/);
});
