import { createHmac, timingSafeEqual } from 'node:crypto';

import { getRazorpayPlan, getRazorpayPlanFromPlanId, type BillablePlan } from './plans';

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

/** Checkout signature for a subscription's authorisation payment. */
export function verifyRazorpaySubscriptionSignature(input: {
  subscriptionId: string;
  paymentId: string;
  signature: string;
  secret: string | null;
}): boolean {
  if (!input.secret) return false;
  const expected = createHmac('sha256', input.secret)
    .update(`${input.paymentId}|${input.subscriptionId}`)
    .digest('hex');
  return safeHexEqual(expected, input.signature);
}

export interface RazorpayPlanLike {
  id: string;
  period: string;
  interval: number;
  item: { amount: number | string; currency: string };
}

/** A dashboard plan must charge exactly what the pricing page promises, monthly. */
export function validateRazorpayPlanDefinition(plan: RazorpayPlanLike, expected: BillablePlan): void {
  const catalog = getRazorpayPlan(expected);
  const amount = typeof plan.item?.amount === 'number' ? plan.item.amount : Number(plan.item?.amount);
  if (!catalog || plan.period !== 'monthly' || plan.interval !== 1 ||
    amount !== catalog.amount || plan.item?.currency !== catalog.currency) {
    throw new Error('payment_unconfigured');
  }
}

export interface RazorpaySubscriptionLike {
  id: string;
  plan_id: string;
  status: string;
  notes?: Record<string, string | number | null> | unknown[] | null;
}

export interface ResolvedRazorpaySubscription {
  orgId: string;
  subscriptionId: string;
  /** The plan the organization is entitled to now: paid only while the subscription is active. */
  plan: BillablePlan | 'free';
  status: string;
}

export function resolveRazorpaySubscription(
  subscription: RazorpaySubscriptionLike,
  environment: Record<string, string | undefined>,
): ResolvedRazorpaySubscription {
  const notes = subscription.notes && !Array.isArray(subscription.notes) ? subscription.notes : {};
  const orgId = typeof notes.org_id === 'string' ? notes.org_id.trim() : '';
  if (!subscription.id?.startsWith('sub_') || !orgId) throw new Error('invalid_subscription');
  const paidPlan = getRazorpayPlanFromPlanId(subscription.plan_id, environment);
  if (!paidPlan) throw new Error('invalid_subscription_price');
  return { orgId, subscriptionId: subscription.id, status: subscription.status,
    plan: subscription.status === 'active' ? paidPlan : 'free' };
}

/** Statuses after which Razorpay will never charge the subscription again. */
export function isRazorpaySubscriptionClosed(status: string): boolean {
  return status === 'cancelled' || status === 'completed' || status === 'expired';
}

export function extractRazorpaySubscriptionId(payload: unknown): string | null {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
  const body = root?.payload && typeof root.payload === 'object' ? root.payload as Record<string, unknown> : null;
  const subscription = body?.subscription && typeof body.subscription === 'object' ? body.subscription as Record<string, unknown> : null;
  const entity = subscription?.entity && typeof subscription.entity === 'object' ? subscription.entity as Record<string, unknown> : null;
  return typeof entity?.id === 'string' && entity.id.startsWith('sub_') ? entity.id : null;
}
