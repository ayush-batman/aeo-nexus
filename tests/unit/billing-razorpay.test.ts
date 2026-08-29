import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import {
  validateRazorpayPayment,
  verifyRazorpayWebhookSignature,
} from '../../lib/billing/razorpay';

test('Razorpay webhook verification fails closed', () => {
  const body = JSON.stringify({ event: 'payment.captured' });
  const secret = 'test_webhook_secret';
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(body, null, secret), false);
  assert.equal(verifyRazorpayWebhookSignature(body, signature, null), false);
  assert.equal(verifyRazorpayWebhookSignature(body, 'short', secret), false);
  assert.equal(verifyRazorpayWebhookSignature(`${body}x`, signature, secret), false);
});

test('Razorpay payment must match the authoritative order and plan', () => {
  const result = validateRazorpayPayment({
    payment: {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 499_900,
      currency: 'INR',
      status: 'captured',
    },
    order: {
      id: 'order_123',
      amount: 499_900,
      currency: 'INR',
      status: 'paid',
      notes: { org_id: 'org_123', db_plan: 'starter' },
    },
  });

  assert.deepEqual(result, {
    orgId: 'org_123',
    plan: 'starter',
    paymentId: 'pay_123',
  });
});

test('Razorpay payment validation rejects mismatched or incomplete data', () => {
  const base = {
    payment: {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 499_900,
      currency: 'INR',
      status: 'captured',
    },
    order: {
      id: 'order_123',
      amount: 499_900,
      currency: 'INR',
      status: 'paid',
      notes: { org_id: 'org_123', db_plan: 'starter' },
    },
  } as const;

  assert.throws(
    () => validateRazorpayPayment({ ...base, payment: { ...base.payment, amount: 1 } }),
    /amount/i,
  );
  assert.throws(
    () => validateRazorpayPayment({ ...base, payment: { ...base.payment, currency: 'USD' } }),
    /currency/i,
  );
  assert.throws(
    () => validateRazorpayPayment({ ...base, payment: { ...base.payment, status: 'failed' } }),
    /captured/i,
  );
  assert.throws(
    () => validateRazorpayPayment({ ...base, order: { ...base.order, notes: { org_id: 'org_123', db_plan: 'enterprise' } } }),
    /plan/i,
  );
  assert.throws(
    () => validateRazorpayPayment({ ...base, order: { ...base.order, notes: { org_id: '', db_plan: 'starter' } } }),
    /organization/i,
  );
});

