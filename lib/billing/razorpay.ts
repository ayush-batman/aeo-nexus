import { createHmac, timingSafeEqual } from 'node:crypto';

import { getRazorpayPlan, type BillablePlan } from './plans';

export interface RazorpayPaymentLike {
  id: string;
  order_id: string;
  amount: number | string;
  currency: string;
  status: string;
}

export interface RazorpayOrderLike {
  id: string;
  amount: number | string;
  currency: string;
  status: string;
  notes?: Record<string, string | number> | null;
}

export interface ValidatedRazorpayPayment {
  orgId: string;
  plan: BillablePlan;
  paymentId: string;
}

function safeHexEqual(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actual) || expected.length !== actual.length) return false;

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function verifyRazorpayWebhookSignature(
  body: string,
  signature: string | null,
  secret: string | null,
): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return safeHexEqual(expected, signature);
}

export function verifyRazorpayPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string | null;
}): boolean {
  if (!input.secret) return false;
  const expected = createHmac('sha256', input.secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');
  return safeHexEqual(expected, input.signature);
}

function toAmount(value: string | number): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error('Payment amount is invalid');
  }
  return amount;
}

export function validateRazorpayPayment(input: {
  payment: RazorpayPaymentLike;
  order: RazorpayOrderLike;
}): ValidatedRazorpayPayment {
  const { payment, order } = input;
  if (!payment.id || !payment.order_id || payment.order_id !== order.id) {
    throw new Error('Payment order does not match');
  }
  if (payment.status !== 'captured') {
    throw new Error('Payment is not captured');
  }
  if (order.status !== 'paid') {
    throw new Error('Order is not paid');
  }

  const notes = order.notes ?? {};
  const orgId = typeof notes.org_id === 'string' ? notes.org_id.trim() : '';
  const dbPlan = typeof notes.db_plan === 'string' ? notes.db_plan : '';
  const plan = getRazorpayPlan(dbPlan);
  if (!orgId) throw new Error('Order is missing its organization');
  if (!plan || plan.dbPlan !== dbPlan) throw new Error('Order has an invalid plan');

  const paymentAmount = toAmount(payment.amount);
  const orderAmount = toAmount(order.amount);
  if (paymentAmount !== orderAmount || orderAmount !== plan.amount) {
    throw new Error('Payment amount does not match the plan');
  }
  if (
    payment.currency !== plan.currency ||
    order.currency !== plan.currency ||
    payment.currency !== order.currency
  ) {
    throw new Error('Payment currency does not match the plan');
  }

  return { orgId, plan: plan.dbPlan, paymentId: payment.id };
}

export function extractRazorpayPaymentId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const payloadObject = root.payload;
  if (!payloadObject || typeof payloadObject !== 'object') return null;
  const payment = (payloadObject as Record<string, unknown>).payment;
  if (!payment || typeof payment !== 'object') return null;
  const entity = (payment as Record<string, unknown>).entity;
  if (!entity || typeof entity !== 'object') return null;
  const id = (entity as Record<string, unknown>).id;
  return typeof id === 'string' && id ? id : null;
}

