'use node';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import { v } from 'convex/values';
import { action, internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { getRazorpayPlan, getRazorpayPlanIdForPlan, getStripePriceForPlan, getStripePlanFromPrice, isBillablePlan } from '../lib/billing/plans';
import { extractRazorpaySubscriptionId, isRazorpaySubscriptionClosed, resolveRazorpaySubscription, validateRazorpayPlanDefinition,
  verifyRazorpaySubscriptionSignature, verifyRazorpayWebhookSignature } from '../lib/billing/razorpay';

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('payment_unconfigured');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
function razorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw new Error('payment_unconfigured');
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}
function siteUrl() {
  const url = new URL(process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aelohq.com');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('payment_unconfigured');
  return url.origin;
}

export const stripeCheckout = action({
  args: { plan: v.string() }, returns: v.object({ url: v.string() }),
  handler: async (ctx, { plan }): Promise<{ url: string }> => {
    const tenant = await ctx.runQuery(internal.billing.context, {});
    if (!isBillablePlan(plan)) throw new Error('invalid_plan');
    const price = getStripePriceForPlan(plan, process.env);
    if (!price) throw new Error('payment_unconfigured');
    const stripe = stripeClient();
    let customer = tenant.customerId;
    if (!customer) {
      const created = await stripe.customers.create({ email: tenant.email,
        metadata: { org_id: tenant.orgId, user_id: tenant.userId } }, { idempotencyKey: `aelo-customer-${tenant.orgId}` });
      customer = await ctx.runMutation(internal.billing.saveCustomer, { orgId: tenant.orgId, customerId: created.id });
    }
    const session = await stripe.checkout.sessions.create({ customer, payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }], mode: 'subscription',
      success_url: `${siteUrl()}/dashboard/settings?success=true`, cancel_url: `${siteUrl()}/dashboard/settings?canceled=true`,
      metadata: { org_id: tenant.orgId, plan }, subscription_data: { metadata: { org_id: tenant.orgId } } });
    if (!session.url) throw new Error('payment_checkout_failed');
    return { url: session.url };
  },
});

// Razorpay bills monthly through Subscriptions. A one-time order would grant a
// "per month" plan forever, because nothing would ever charge or downgrade it.
const RAZORPAY_BILLING_CYCLES = 120;

export const razorpaySubscribe = action({
  args: { plan: v.string() },
  returns: v.object({ subscriptionId: v.string(), keyId: v.string(), planName: v.string(), amount: v.number(), currency: v.string() }),
  handler: async (ctx, { plan }): Promise<{ subscriptionId: string; keyId: string; planName: string; amount: number; currency: string }> => {
    const tenant = await ctx.runQuery(internal.billing.context, {});
    const details = getRazorpayPlan(plan);
    if (!details) throw new Error('invalid_plan');
    const planId = getRazorpayPlanIdForPlan(details.dbPlan, process.env);
    if (!planId) throw new Error('payment_unconfigured');
    const provider = razorpayClient();
    validateRazorpayPlanDefinition(await provider.plans.fetch(planId), details.dbPlan);
    const subscription = await provider.subscriptions.create({ plan_id: planId, total_count: RAZORPAY_BILLING_CYCLES,
      customer_notify: 1, notes: { org_id: tenant.orgId, user_id: tenant.userId, db_plan: details.dbPlan } });
    return { subscriptionId: subscription.id, keyId: process.env.RAZORPAY_KEY_ID!, planName: details.displayName,
      amount: details.amount, currency: details.currency };
  },
});

async function applyRazorpaySubscription(ctx: ActionCtx, subscriptionId: string, eventType: string, eventId: string, expectedOrg?: string) {
  const provider = razorpayClient();
  const subscription = await provider.subscriptions.fetch(subscriptionId);
  if (subscription.id !== subscriptionId) throw new Error('invalid_subscription');
  const resolved = resolveRazorpaySubscription(subscription, process.env);
  if (expectedOrg && resolved.orgId !== expectedOrg) throw new Error('forbidden_role');
  // Moving to a new tier must not leave the previous subscription charging too.
  // Cancel it before recording the new plan so a retried event can finish the job.
  const previous: string | null = await ctx.runQuery(internal.billing.razorpaySubscriptionFor, { orgId: resolved.orgId });
  if (resolved.plan !== 'free' && previous && previous !== subscriptionId && previous.startsWith('sub_')) {
    const old = await provider.subscriptions.fetch(previous);
    if (!isRazorpaySubscriptionClosed(old.status)) await provider.subscriptions.cancel(previous, false);
  }
  const applied: boolean = await ctx.runMutation(internal.billing.applyVerifiedEvent, {
    provider: 'razorpay', eventId, eventType, orgId: resolved.orgId, plan: resolved.plan,
    subscriptionId, occurredAt: Date.now() });
  return { plan: resolved.plan, status: resolved.status, duplicate: !applied };
}

export const razorpayVerify = action({
  args: { subscriptionId: v.string(), paymentId: v.string(), signature: v.string() },
  returns: v.object({ success: v.boolean(), plan: v.string(), status: v.string(), duplicate: v.boolean() }),
  handler: async (ctx, args): Promise<{ success: boolean; plan: string; status: string; duplicate: boolean }> => {
    const tenant = await ctx.runQuery(internal.billing.context, {});
    razorpayClient();
    if (!verifyRazorpaySubscriptionSignature({ ...args, secret: process.env.RAZORPAY_KEY_SECRET! })) throw new Error('invalid_signature');
    const result = await applyRazorpaySubscription(ctx, args.subscriptionId, 'client.subscription.verified',
      `client:${args.paymentId}`, tenant.orgId);
    return { success: true, ...result };
  },
});

export const razorpayWebhook = internalAction({
  args: { body: v.string(), signature: v.string(), eventId: v.optional(v.string()) },
  returns: v.object({ received: v.boolean(), ignored: v.optional(v.boolean()), duplicate: v.optional(v.boolean()) }),
  handler: async (ctx, args): Promise<{ received: boolean; ignored?: boolean; duplicate?: boolean }> => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error('payment_unconfigured');
    if (!verifyRazorpayWebhookSignature(args.body, args.signature, secret)) throw new Error('invalid_signature');
    const payload: unknown = JSON.parse(args.body);
    const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const eventType = typeof root.event === 'string' ? root.event : '';
    // Subscription invoices also emit payment.* and order.* events; only the
    // subscription's own state decides the plan.
    if (!eventType.startsWith('subscription.')) return { received: true, ignored: true };
    const subscriptionId = extractRazorpaySubscriptionId(payload);
    if (!subscriptionId) throw new Error('invalid_subscription');
    const eventId = args.eventId?.trim() || `${eventType}:${subscriptionId}:${String(root.created_at ?? '')}`;
    try {
      const result = await applyRazorpaySubscription(ctx, subscriptionId, eventType, eventId);
      return { received: true, duplicate: result.duplicate };
    } catch (error) {
      // A subscription Aelo did not create carries no organization note; retrying cannot fix it.
      if (error instanceof Error && error.message === 'invalid_subscription') return { received: true, ignored: true };
      throw error;
    }
  },
});

function stripeCancelsAt(subscription: Stripe.Subscription): number | null {
  if (!subscription.cancel_at_period_end && !subscription.cancel_at) return null;
  const end = subscription.cancel_at ?? subscription.items.data[0]?.current_period_end;
  return typeof end === 'number' ? end * 1000 : null;
}

/** Stops renewal at the end of the paid period; the provider's cancellation event then ends the plan. */
export const cancelSubscription = action({
  args: {}, returns: v.object({ cancelsAt: v.number() }),
  handler: async (ctx): Promise<{ cancelsAt: number }> => {
    const tenant = await ctx.runQuery(internal.billing.context, {});
    const { summary, subscriptionId } = await ctx.runQuery(internal.billing.subscriptionFor, { orgId: tenant.orgId });
    if (summary.kind !== 'subscription' || !subscriptionId) throw new Error('nothing_to_cancel');
    if (summary.cancelsAt !== null) return { cancelsAt: summary.cancelsAt };
    let cancelsAt: number | null;
    if (summary.provider === 'stripe') {
      cancelsAt = stripeCancelsAt(await stripeClient().subscriptions.update(subscriptionId, { cancel_at_period_end: true }));
    } else {
      const subscription = await razorpayClient().subscriptions.cancel(subscriptionId, true);
      const end = subscription.current_end ?? subscription.charge_at;
      cancelsAt = typeof end === 'number' ? end * 1000 : null;
    }
    if (cancelsAt === null) throw new Error('payment_cancel_failed');
    await ctx.runMutation(internal.billing.recordCancellation, { orgId: tenant.orgId, subscriptionId, cancelsAt });
    return { cancelsAt };
  },
});

export const stripeWebhook = internalAction({
  args: { body: v.string(), signature: v.string() }, returns: v.object({ received: v.boolean(), ignored: v.optional(v.boolean()) }),
  handler: async (ctx, args): Promise<{ received: boolean; ignored?: boolean }> => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('payment_unconfigured');
    const stripe = stripeClient();
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(args.body, args.signature, process.env.STRIPE_WEBHOOK_SECRET); }
    catch { throw new Error('invalid_signature'); }
    let subscription: Stripe.Subscription;
    let orgId: string | null;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const id = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (!id || !session.metadata?.org_id) throw new Error('invalid_checkout');
      if (!['paid', 'no_payment_required'].includes(session.payment_status)) throw new Error('invalid_payment');
      subscription = await stripe.subscriptions.retrieve(id);
      orgId = session.metadata.org_id;
      if (subscription.metadata.org_id && subscription.metadata.org_id !== orgId) throw new Error('invalid_billing_organization');
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      subscription = event.data.object;
      orgId = subscription.metadata.org_id || null;
    } else return { received: true, ignored: true };
    const active = ['active', 'trialing'].includes(subscription.status);
    const plan = active ? getStripePlanFromPrice(subscription.items.data[0]?.price.id ?? null, process.env) : 'free';
    if (!plan) throw new Error('invalid_subscription_price');
    await ctx.runMutation(internal.billing.applyVerifiedEvent, { provider: 'stripe', eventId: event.id, eventType: event.type,
      orgId, plan, subscriptionId: subscription.id, occurredAt: event.created * 1000, cancelsAt: stripeCancelsAt(subscription) });
    return { received: true };
  },
});
