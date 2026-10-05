import assert from 'node:assert/strict';
import test from 'node:test';
import { LEGACY_RAZORPAY_ACCESS_MS, billingSummary, legacyPaidUntil } from '../../lib/billing/billing-state';

const base = { plan: 'starter', stripeSubscriptionId: null, razorpaySubscriptionId: null } as const;

test('legacy one-time Razorpay payers get 30 days from deploy day, whatever their payment date', () => {
  const org = { ...base, billingProvider: 'razorpay' as const, razorpaySubscriptionId: 'pay_1', billingOccurredAt: 1_000 };
  assert.equal(legacyPaidUntil(org, 5_000), 5_000 + LEGACY_RAZORPAY_ACCESS_MS);
  assert.equal(legacyPaidUntil({ ...org, billingOccurredAt: undefined }, 5_000), 5_000 + LEGACY_RAZORPAY_ACCESS_MS);
  // Once stamped by the first job run, the end date stays fixed.
  assert.equal(legacyPaidUntil({ ...org, billingCancelsAt: 42 }, 5_000), 42);
  assert.deepEqual(billingSummary(org, 5_000), { kind: 'one_time', provider: 'razorpay', cancelsAt: null, paidUntil: 5_000 + LEGACY_RAZORPAY_ACCESS_MS });
});

test('renewing subscriptions report a scheduled cancellation; free plans report nothing', () => {
  assert.deepEqual(billingSummary({ ...base, billingProvider: 'razorpay', razorpaySubscriptionId: 'sub_1' }, 0),
    { kind: 'subscription', provider: 'razorpay', cancelsAt: null, paidUntil: null });
  assert.deepEqual(billingSummary({ ...base, stripeSubscriptionId: 'sub_s', billingCancelsAt: 9 }, 0),
    { kind: 'subscription', provider: 'stripe', cancelsAt: 9, paidUntil: null });
  assert.equal(billingSummary({ ...base, plan: 'free', stripeSubscriptionId: 'sub_s' }, 0).kind, 'none');
  assert.equal(billingSummary(base, 0).kind, 'none');
});
