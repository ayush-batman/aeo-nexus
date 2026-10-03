import assert from 'node:assert/strict';
import test from 'node:test';
import { convexRouteError } from '../../lib/convex/http';

test('unconfigured checkout gives a clear safe failure without exposing backend details', async () => {
  const response = convexRouteError(new Error('[CONVEX A(billingActions:razorpayOrder)] payment_unconfigured'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Checkout is temporarily unavailable. No charge was made.' });
});
