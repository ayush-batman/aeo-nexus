import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { requireRole, requireTenant } from './lib/tenant';
import { planValidator } from './validators';
import { billingProviderOf, billingSummary, isLegacyRazorpayPayment, legacyPaidUntil } from '../lib/billing/billing-state';

export const context = internalQuery({
  args: {},
  returns: v.object({ orgId: v.string(), userId: v.string(), email: v.string(), customerId: v.union(v.string(), v.null()) }),
  handler: async (ctx) => {
    const tenant = await requireTenant(ctx);
    requireRole(tenant, 'admin');
    return { orgId: tenant.organization.publicId, userId: tenant.user.publicId,
      email: tenant.user.email, customerId: tenant.organization.stripeCustomerId };
  },
});

export const saveCustomer = internalMutation({
  args: { orgId: v.string(), customerId: v.string() }, returns: v.string(),
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx);
    requireRole(tenant, 'admin');
    if (tenant.organization.publicId !== args.orgId) throw new Error('forbidden_role');
    if (tenant.organization.stripeCustomerId) return tenant.organization.stripeCustomerId;
    await ctx.db.patch(tenant.organization._id, { stripeCustomerId: args.customerId, updatedAt: Date.now() });
    return args.customerId;
  },
});

/** The Razorpay subscription an organization is currently billed through, if any. */
export const razorpaySubscriptionFor = internalQuery({
  args: { orgId: v.string() }, returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const org = await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', args.orgId)).unique();
    return org?.razorpaySubscriptionId ?? null;
  },
});

/** Only signature-verified provider actions may call this atomic ledger writer. */
export const applyVerifiedEvent = internalMutation({
  args: { provider: v.union(v.literal('stripe'), v.literal('razorpay')), eventId: v.string(), eventType: v.string(),
    orgId: v.union(v.string(), v.null()), plan: planValidator, subscriptionId: v.string(), occurredAt: v.number(),
    cancelsAt: v.optional(v.union(v.number(), v.null())) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (!args.eventId.trim() || !args.eventType.trim() || !args.subscriptionId.trim() || !Number.isFinite(args.occurredAt) || args.occurredAt < 0) {
      throw new Error('invalid_billing_event');
    }
    const duplicate = await ctx.db.query('billingWebhookEvents').withIndex('by_provider_and_event_id', q =>
      q.eq('provider', args.provider).eq('eventId', args.eventId)).unique();
    if (duplicate) return false;
    const org = args.orgId
      ? await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', args.orgId!)).unique()
      : args.provider === 'stripe'
        ? await ctx.db.query('organizations').withIndex('by_stripe_subscription_id', q => q.eq('stripeSubscriptionId', args.subscriptionId)).unique()
        : null;
    if (!org) throw new Error('billing_organization_not_found');
    const latest = await ctx.db.query('billingWebhookEvents').withIndex('by_provider_organization_occurred_at', q =>
      q.eq('provider', args.provider).eq('organizationId', org._id)).order('desc').first();
    const currentSubscription = args.provider === 'stripe' ? org.stripeSubscriptionId : org.razorpaySubscriptionId;
    // A cancellation describes one subscription, not all present/future purchases.
    const wrongCancellation = args.plan === 'free' && (currentSubscription !== args.subscriptionId ||
      (org.billingProvider !== undefined && org.billingProvider !== args.provider) ||
      (org.billingProvider === undefined && args.provider === 'stripe' && org.razorpaySubscriptionId !== null));
    const stale = (latest?.occurredAt ?? -1) > args.occurredAt || (org.billingOccurredAt ?? -1) > args.occurredAt;
    const applied = !stale && !wrongCancellation;
    await ctx.db.insert('billingWebhookEvents', { publicId: crypto.randomUUID(), provider: args.provider,
      eventId: args.eventId, eventType: args.eventType, organizationId: org._id, plan: args.plan,
      providerSubscriptionId: args.subscriptionId, occurredAt: args.occurredAt, appliedAt: Date.now(), changedOrganization: applied });
    // A scheduled cancellation belongs to one subscription: a new subscription or
    // an ended plan clears it; the provider's own value wins when it reports one.
    const billingCancelsAt = args.plan === 'free' ? null : args.cancelsAt !== undefined ? args.cancelsAt
      : currentSubscription !== args.subscriptionId ? null : org.billingCancelsAt ?? null;
    if (applied) await ctx.db.patch(org._id, { plan: args.plan, billingProvider: args.provider,
      billingOccurredAt: args.occurredAt, billingCancelsAt, updatedAt: Date.now(),
      ...(args.provider === 'stripe' ? { stripeSubscriptionId: args.plan === 'free' ? null : args.subscriptionId }
        : { razorpaySubscriptionId: args.plan === 'free' ? null : args.subscriptionId }) });
    return applied;
  },
});

const billingSummaryValidator = v.object({
  kind: v.union(v.literal('none'), v.literal('subscription'), v.literal('one_time')),
  provider: v.union(v.literal('stripe'), v.literal('razorpay'), v.null()),
  cancelsAt: v.union(v.number(), v.null()), paidUntil: v.union(v.number(), v.null()),
});

/** What the cancel action needs: the subscription the organization is billed through now. */
export const subscriptionFor = internalQuery({
  args: { orgId: v.string() },
  returns: v.object({ summary: billingSummaryValidator, subscriptionId: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const org = await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', args.orgId)).unique();
    if (!org) throw new Error('billing_organization_not_found');
    const summary = billingSummary(org, Date.now());
    const subscriptionId = summary.provider === 'stripe' ? org.stripeSubscriptionId
      : summary.provider === 'razorpay' ? org.razorpaySubscriptionId : null;
    return { summary, subscriptionId };
  },
});

export const recordCancellation = internalMutation({
  args: { orgId: v.string(), subscriptionId: v.string(), cancelsAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const tenant = await requireTenant(ctx);
    requireRole(tenant, 'admin');
    const org = tenant.organization;
    if (org.publicId !== args.orgId) throw new Error('forbidden_role');
    const provider = billingProviderOf(org);
    const current = provider === 'stripe' ? org.stripeSubscriptionId : org.razorpaySubscriptionId;
    // The subscription changed while the provider call ran; the newer state stands.
    if (current !== args.subscriptionId) return null;
    await ctx.db.patch(org._id, { billingCancelsAt: args.cancelsAt, updatedAt: Date.now() });
    return null;
  },
});

/** Daily: give legacy one-time Razorpay payers an end date 30 days after the first run, and move them to Free once it passes. */
export const expireLegacyRazorpayOrders = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Razorpay payment ids start with "pay_"; "`" sorts directly after "_".
    const page = await ctx.db.query('organizations').withIndex('by_razorpay_subscription_id', q =>
      q.gte('razorpaySubscriptionId', 'pay_').lt('razorpaySubscriptionId', 'pay`')).paginate({ cursor: args.cursor, numItems: 100 });
    for (const org of page.page) {
      const reference = org.razorpaySubscriptionId;
      if (!isLegacyRazorpayPayment(reference)) continue;
      // Another provider bills this organization now; only drop the stale reference.
      if (billingProviderOf(org) !== 'razorpay' || org.plan === 'free') {
        await ctx.db.patch(org._id, { razorpaySubscriptionId: null, updatedAt: now });
        continue;
      }
      const paidUntil = legacyPaidUntil(org, now);
      if (paidUntil > now) {
        if (org.billingCancelsAt !== paidUntil) await ctx.db.patch(org._id, { billingCancelsAt: paidUntil, updatedAt: now });
        continue;
      }
      await ctx.db.insert('billingWebhookEvents', { publicId: crypto.randomUUID(), provider: 'razorpay',
        eventId: `legacy-expiry:${reference}`, eventType: 'aelo.legacy_payment_expired', organizationId: org._id, plan: 'free',
        providerSubscriptionId: reference, occurredAt: now, appliedAt: now, changedOrganization: true });
      await ctx.db.patch(org._id, { plan: 'free', razorpaySubscriptionId: null, billingCancelsAt: null,
        billingOccurredAt: now, updatedAt: now });
    }
    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.billing.expireLegacyRazorpayOrders, { cursor: page.continueCursor });
    return null;
  },
});
