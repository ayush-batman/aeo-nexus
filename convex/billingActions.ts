'use node';
import Stripe from 'stripe';
import Razorpay from 'razorpay';
import { v } from 'convex/values';
import { action, internalAction, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { getRazorpayPlan, getStripePriceForPlan, getStripePlanFromPrice, isBillablePlan } from '../lib/billing/plans';
import { extractRazorpayPaymentId, validateRazorpayPayment, verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from '../lib/billing/razorpay';

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

export const razorpayOrder = action({
  args: { plan: v.string() },
  returns: v.object({ orderId: v.string(), amount: v.number(), currency: v.string(), keyId: v.string(), planName: v.string(), plan: v.string() }),
  handler: async (ctx, { plan }): Promise<{ orderId: string; amount: number; currency: string; keyId: string; planName: string; plan: string }> => {
    const tenant = await ctx.runQuery(internal.billing.context, {});
    const details = getRazorpayPlan(plan);
    if (!details) throw new Error('invalid_plan');
    const order = await razorpayClient().orders.create({ amount: details.amount, currency: details.currency,
      receipt: `ord_${crypto.randomUUID().slice(0, 30)}`, notes: { org_id: tenant.orgId, user_id: tenant.userId,
        db_plan: details.dbPlan, display_plan: plan } });
    return { orderId: order.id, amount: Number(order.amount), currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID!, planName: details.displayName, plan: details.displayName };
  },
});

async function applyRazorpay(ctx: ActionCtx, paymentId: string, eventType: string, expectedOrg?: string, expectedOrder?: string) {
  const provider = razorpayClient();
  const payment = await provider.payments.fetch(paymentId);
  if (payment.id !== paymentId || (expectedOrder && payment.order_id !== expectedOrder)) throw new Error('invalid_payment');
  const order = await provider.orders.fetch(payment.order_id);
  const validated = validateRazorpayPayment({ payment, order });
  if (expectedOrg && validated.orgId !== expectedOrg) throw new Error('forbidden_role');
  if (!Number.isFinite(payment.created_at)) throw new Error('invalid_payment_timestamp');
  const applied: boolean = await ctx.runMutation(internal.billing.applyVerifiedEvent, {
    provider: 'razorpay', eventId: `payment:${validated.paymentId}`, eventType, orgId: validated.orgId,
    plan: validated.plan, subscriptionId: validated.paymentId, occurredAt: payment.created_at * 1000 });
  return { success: true, plan: validated.plan, duplicate: !applied };
}

export const razorpayVerify = action({
  args: { orderId: v.string(), paymentId: v.string(), signature: v.string() },
  returns: v.object({ success: v.boolean(), plan: v.string(), duplicate: v.boolean() }),
  handler: async (ctx, args): Promise<{ success: boolean; plan: string; duplicate: boolean }> => {
    const tenant = await ctx.runQuery(internal.billing.context, {});
    razorpayClient();
    if (!verifyRazorpayPaymentSignature({ ...args, secret: process.env.RAZORPAY_KEY_SECRET! })) throw new Error('invalid_signature');
    return applyRazorpay(ctx, args.paymentId, 'client.payment.verified', tenant.orgId, args.orderId);
  },
});

export const razorpayWebhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  returns: v.object({ received: v.boolean(), ignored: v.optional(v.boolean()), duplicate: v.optional(v.boolean()) }),
  handler: async (ctx, args): Promise<{ received: boolean; ignored?: boolean; duplicate?: boolean }> => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error('payment_unconfigured');
    if (!verifyRazorpayWebhookSignature(args.body, args.signature, secret)) throw new Error('invalid_signature');
    const payload: unknown = JSON.parse(args.body);
    const eventType = payload && typeof payload === 'object' && 'event' in payload ? payload.event : null;
    if (eventType !== 'payment.captured' && eventType !== 'order.paid') return { received: true, ignored: true };
    const paymentId = extractRazorpayPaymentId(payload);
    if (!paymentId) throw new Error('invalid_payment');
    const result = await applyRazorpay(ctx, paymentId, eventType);
    return { received: true, duplicate: result.duplicate };
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
      orgId, plan, subscriptionId: subscription.id, occurredAt: event.created * 1000 });
    return { received: true };
  },
});
