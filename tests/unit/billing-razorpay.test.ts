import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import {
  extractRazorpaySubscriptionId,
  isRazorpaySubscriptionClosed,
  resolveRazorpaySubscription,
  validateRazorpayPlanDefinition,
  verifyRazorpaySubscriptionSignature,
  verifyRazorpayWebhookSignature,
} from '../../lib/billing/razorpay';

const env = { RAZORPAY_STARTER_PLAN_ID: 'plan_Radar1', RAZORPAY_PRO_PLAN_ID: 'plan_Command1' };

test('Razorpay webhook verification fails closed', () => {
  const body = JSON.stringify({ event: 'subscription.charged' });
  const secret = 'test_webhook_secret';
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(body, null, secret), false);
  assert.equal(verifyRazorpayWebhookSignature(body, signature, null), false);
  assert.equal(verifyRazorpayWebhookSignature(body, 'short', secret), false);
  assert.equal(verifyRazorpayWebhookSignature(`${body}x`, signature, secret), false);
});

test('subscription checkout signature covers payment and subscription ids', () => {
  const secret = 'test_key_secret';
  const signature = createHmac('sha256', secret).update('pay_1|sub_1').digest('hex');
  assert.equal(verifyRazorpaySubscriptionSignature({ paymentId: 'pay_1', subscriptionId: 'sub_1', signature, secret }), true);
  assert.equal(verifyRazorpaySubscriptionSignature({ paymentId: 'pay_1', subscriptionId: 'sub_2', signature, secret }), false);
  assert.equal(verifyRazorpaySubscriptionSignature({ paymentId: 'pay_1', subscriptionId: 'sub_1', signature, secret: null }), false);
});

test('only an active subscription on a configured plan grants a paid plan', () => {
  const base = { id: 'sub_1', plan_id: 'plan_Radar1', status: 'active', notes: { org_id: 'org_1' } };
  assert.deepEqual(resolveRazorpaySubscription(base, env), { orgId: 'org_1', subscriptionId: 'sub_1', status: 'active', plan: 'starter' });
  for (const status of ['created', 'authenticated', 'pending', 'halted', 'cancelled', 'completed', 'expired']) {
    assert.equal(resolveRazorpaySubscription({ ...base, status }, env).plan, 'free', status);
  }
  assert.throws(() => resolveRazorpaySubscription({ ...base, plan_id: 'plan_Unknown' }, env), /invalid_subscription_price/);
  assert.throws(() => resolveRazorpaySubscription({ ...base, notes: {} }, env), /invalid_subscription/);
  assert.throws(() => resolveRazorpaySubscription({ ...base, notes: [] }, env), /invalid_subscription/);
});

test('dashboard plan must match the catalogue amount, currency and monthly period', () => {
  const plan = { id: 'plan_Radar1', period: 'monthly', interval: 1, item: { amount: 499_900, currency: 'INR' } };
  assert.doesNotThrow(() => validateRazorpayPlanDefinition(plan, 'starter'));
  assert.doesNotThrow(() => validateRazorpayPlanDefinition({ ...plan, item: { ...plan.item, amount: '499900' } }, 'starter'));
  for (const bad of [
    { ...plan, item: { ...plan.item, amount: 1 } },
    { ...plan, item: { ...plan.item, currency: 'USD' } },
    { ...plan, period: 'yearly' },
    { ...plan, interval: 3 },
  ]) assert.throws(() => validateRazorpayPlanDefinition(bad, 'starter'), /payment_unconfigured/);
  assert.throws(() => validateRazorpayPlanDefinition(plan, 'pro'), /payment_unconfigured/);
});

test('webhook payload subscription id and closed statuses', () => {
  assert.equal(extractRazorpaySubscriptionId({ payload: { subscription: { entity: { id: 'sub_9' } } } }), 'sub_9');
  assert.equal(extractRazorpaySubscriptionId({ payload: { payment: { entity: { id: 'pay_9' } } } }), null);
  assert.equal(extractRazorpaySubscriptionId({ payload: { subscription: { entity: { id: 'pay_9' } } } }), null);
  assert.equal(isRazorpaySubscriptionClosed('cancelled'), true);
  assert.equal(isRazorpaySubscriptionClosed('halted'), false);
});
