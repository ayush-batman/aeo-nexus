import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { requireRole, requireTenant } from './lib/tenant';
import { planValidator } from './validators';

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

/** Only signature-verified provider actions may call this atomic ledger writer. */
export const applyVerifiedEvent = internalMutation({
  args: { provider: v.union(v.literal('stripe'), v.literal('razorpay')), eventId: v.string(), eventType: v.string(),
    orgId: v.union(v.string(), v.null()), plan: planValidator, subscriptionId: v.string(), occurredAt: v.number() },
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
    if (applied) await ctx.db.patch(org._id, { plan: args.plan, billingProvider: args.provider,
      billingOccurredAt: args.occurredAt, updatedAt: Date.now(),
      ...(args.provider === 'stripe' ? { stripeSubscriptionId: args.plan === 'free' ? null : args.subscriptionId }
        : { razorpaySubscriptionId: args.plan === 'free' ? null : args.subscriptionId }) });
    return applied;
  },
});
