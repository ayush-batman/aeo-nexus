import { describe, expect, test } from 'vitest';
import { api, internal } from '../../convex/_generated/api';
import { fixture } from './fixtures';

describe('atomic billing ledger', () => {
  test('deduplicates payments and rejects stale updates and cancellation of a replaced subscription', async () => {
    const { t, context } = await fixture();
    const event = { provider: 'stripe' as const, eventId: 'evt-first', eventType: 'customer.subscription.updated',
      orgId: context.orgId, plan: 'pro' as const, subscriptionId: 'sub-old', occurredAt: 1000 };
    expect(await t.mutation(internal.billing.applyVerifiedEvent, event)).toBe(true);
    expect(await t.mutation(internal.billing.applyVerifiedEvent, event)).toBe(false);
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'evt-replace', subscriptionId: 'sub-new', occurredAt: 2000 })).toBe(true);
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'evt-stale', plan: 'free', occurredAt: 500 })).toBe(false);
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'evt-cancel-old', plan: 'free', occurredAt: 3000 })).toBe(false);
    const org = await t.run(ctx => ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', context.orgId)).unique());
    expect(org?.plan).toBe('pro');
    expect(org?.stripeSubscriptionId).toBe('sub-new');
    expect(await t.run(ctx => ctx.db.query('billingWebhookEvents').collect())).toHaveLength(4);
  });
  test('Stripe cancellation cannot erase a newer Razorpay purchase; unknown organizations are retriable failures', async () => {
    const { t, context } = await fixture();
    const event = { provider: 'stripe' as const, eventId: 'stripe-paid', eventType: 'updated', orgId: context.orgId,
      plan: 'starter' as const, subscriptionId: 'sub-1', occurredAt: 1000 };
    await t.mutation(internal.billing.applyVerifiedEvent, event);
    await t.mutation(internal.billing.applyVerifiedEvent, { ...event, provider: 'razorpay', eventId: 'payment:1', plan: 'agency', subscriptionId: 'pay-1', occurredAt: 2000 });
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'stripe-cancel', plan: 'free', occurredAt: 3000 })).toBe(false);
    const org = await t.run(ctx => ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', context.orgId)).unique());
    expect(org?.plan).toBe('agency');
    await expect(t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'unknown', orgId: 'missing' })).rejects.toThrow('billing_organization_not_found');
    expect(await t.run(ctx => ctx.db.query('billingWebhookEvents').withIndex('by_provider_and_event_id', q => q.eq('provider', 'stripe').eq('eventId', 'unknown')).unique())).toBeNull();
  });
  test('Razorpay subscription states move only the subscription the organization is billed through', async () => {
    const { t, context } = await fixture();
    const event = { provider: 'razorpay' as const, eventType: 'subscription.activated', orgId: context.orgId,
      plan: 'starter' as const, subscriptionId: 'sub_radar', occurredAt: 1000 };
    const plan = async () => (await t.run(ctx => ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', context.orgId)).unique()))?.plan;
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'activated' })).toBe(true);
    // A new subscription that is only authenticated (not yet charged) must not downgrade the paid one.
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'new-authenticated', plan: 'free', subscriptionId: 'sub_command', occurredAt: 2000 })).toBe(false);
    expect(await plan()).toBe('starter');
    // Upgrade: the new subscription becomes current; the old one's cancellation is then ignored.
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'new-active', plan: 'pro', subscriptionId: 'sub_command', occurredAt: 3000 })).toBe(true);
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'old-cancelled', plan: 'free', occurredAt: 4000 })).toBe(false);
    expect(await plan()).toBe('pro');
    // A failed renewal (pending/halted) or cancellation of the current subscription ends the paid plan.
    expect(await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'halted', plan: 'free', subscriptionId: 'sub_command', occurredAt: 5000 })).toBe(true);
    expect(await plan()).toBe('free');
  });
  test('legacy one-time Razorpay payers keep 30 days from the first expiry run, then move to Free', async () => {
    const { t, context } = await fixture();
    const day = 86_400_000;
    const now = Date.now();
    const ids = await t.run(async ctx => {
      const own = await ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', context.orgId)).unique();
      // Paid long ago: still gets the full 30 days from the first run, not an immediate downgrade.
      await ctx.db.patch(own!._id, { plan: 'starter', billingProvider: 'razorpay', razorpaySubscriptionId: 'pay_old', billingOccurredAt: now - 90 * day });
      const base = { name: 'Org', stripeCustomerId: null, stripeSubscriptionId: null, createdAt: now, updatedAt: now };
      const recent = await ctx.db.insert('organizations', { ...base, publicId: 'recent', plan: 'pro', billingProvider: 'razorpay',
        razorpaySubscriptionId: 'pay_recent', billingOccurredAt: now - 2 * day });
      const movedToStripe = await ctx.db.insert('organizations', { ...base, publicId: 'stripe', plan: 'pro', billingProvider: 'stripe',
        stripeSubscriptionId: 'sub_stripe', razorpaySubscriptionId: 'pay_stale', billingOccurredAt: now - 90 * day });
      const subscriber = await ctx.db.insert('organizations', { ...base, publicId: 'sub', plan: 'pro', billingProvider: 'razorpay',
        razorpaySubscriptionId: 'sub_live', billingOccurredAt: now - 90 * day });
      return { own: own!._id, recent, movedToStripe, subscriber };
    });
    const read = () => t.run(ctx => Promise.all([ids.own, ids.recent, ids.movedToStripe, ids.subscriber].map(id => ctx.db.get(id))));
    await t.mutation(internal.billing.expireLegacyRazorpayOrders, { cursor: null });
    const [ownFirst, recentFirst, movedToStripe, subscriber] = await read();
    for (const org of [ownFirst, recentFirst]) {
      expect(org?.plan).not.toBe('free');
      expect(org?.billingCancelsAt).toBeGreaterThanOrEqual(now + 30 * day);
      expect(org?.billingCancelsAt).toBeLessThan(now + 30 * day + 60_000);
    }
    expect(movedToStripe).toMatchObject({ plan: 'pro', stripeSubscriptionId: 'sub_stripe', razorpaySubscriptionId: null });
    expect(subscriber).toMatchObject({ plan: 'pro', razorpaySubscriptionId: 'sub_live' });
    // A later run keeps the stamped date; once it has passed, the organization moves to Free.
    const stamped = recentFirst?.billingCancelsAt;
    await t.run(ctx => ctx.db.patch(ids.own, { billingCancelsAt: now - 1 }));
    await t.mutation(internal.billing.expireLegacyRazorpayOrders, { cursor: null });
    const [own, recent] = await read();
    expect(own).toMatchObject({ plan: 'free', razorpaySubscriptionId: null, billingCancelsAt: null });
    expect(recent).toMatchObject({ plan: 'pro', razorpaySubscriptionId: 'pay_recent', billingCancelsAt: stamped });
    const ledger = await t.run(ctx => ctx.db.query('billingWebhookEvents').collect());
    expect(ledger.map(row => row.eventId)).toEqual(['legacy-expiry:pay_old']);
  });
  test('a scheduled cancellation is recorded for the current subscription and cleared by a new one', async () => {
    const { t, owner, context } = await fixture();
    const event = { provider: 'razorpay' as const, eventType: 'subscription.activated', orgId: context.orgId,
      plan: 'starter' as const, subscriptionId: 'sub_a', occurredAt: 1000 };
    await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'a' });
    const org = async () => t.run(ctx => ctx.db.query('organizations').withIndex('by_public_id', q => q.eq('publicId', context.orgId)).unique());
    await owner.mutation(internal.billing.recordCancellation, { orgId: context.orgId, subscriptionId: 'sub_other', cancelsAt: 5000 });
    expect((await org())?.billingCancelsAt ?? null).toBeNull();
    await owner.mutation(internal.billing.recordCancellation, { orgId: context.orgId, subscriptionId: 'sub_a', cancelsAt: 5000 });
    expect((await org())?.billingCancelsAt).toBe(5000);
    expect((await owner.query(api.settings.organization, { orgId: context.orgId })).billing).toEqual(
      { kind: 'subscription', provider: 'razorpay', cancelsAt: 5000, paidUntil: null });
    // A charge on the same subscription keeps the scheduled end; a new subscription clears it.
    await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'charged', occurredAt: 2000 });
    expect((await org())?.billingCancelsAt).toBe(5000);
    await t.mutation(internal.billing.applyVerifiedEvent, { ...event, eventId: 'b', subscriptionId: 'sub_b', plan: 'pro', occurredAt: 3000 });
    expect((await org())?.billingCancelsAt).toBeNull();
    await expect(t.mutation(internal.billing.recordCancellation, { orgId: context.orgId, subscriptionId: 'sub_b', cancelsAt: 1 })).rejects.toThrow();
  });
  test('cancel action refuses before contacting a provider when nothing renews', async () => {
    const { owner } = await fixture();
    await expect(owner.action(api.billingActions.cancelSubscription, {})).rejects.toThrow('nothing_to_cancel');
  });
  test('checkout context and customer attachment require an authenticated admin', async () => {
    const { t, owner, context } = await fixture();
    await expect(t.query(internal.billing.context, {})).rejects.toThrow();
    expect((await owner.query(internal.billing.context, {})).orgId).toBe(context.orgId);
    await t.run(async ctx => { const membership = await ctx.db.query('memberships').first(); await ctx.db.patch(membership!._id, { role: 'editor' }); });
    await expect(owner.query(internal.billing.context, {})).rejects.toThrow('forbidden_role');
    await expect(owner.mutation(internal.billing.saveCustomer, { orgId: context.orgId, customerId: 'cus-1' })).rejects.toThrow('forbidden_role');
  });
  test('checkout actions fail before contacting a provider when payment keys are missing', async () => {
    const { owner } = await fixture();
    const previous = {
      stripe: process.env.STRIPE_SECRET_KEY,
      stripePrice: process.env.STRIPE_PRICE_STARTER,
      razorpayId: process.env.RAZORPAY_KEY_ID,
      razorpaySecret: process.env.RAZORPAY_KEY_SECRET,
    };
    Reflect.deleteProperty(process.env, 'STRIPE_SECRET_KEY');
    process.env.STRIPE_PRICE_STARTER = 'price_synthetic';
    Reflect.deleteProperty(process.env, 'RAZORPAY_KEY_ID');
    Reflect.deleteProperty(process.env, 'RAZORPAY_KEY_SECRET');
    try {
      await expect(owner.action(api.billingActions.stripeCheckout, { plan: 'starter' })).rejects.toThrow('payment_unconfigured');
      await expect(owner.action(api.billingActions.razorpaySubscribe, { plan: 'starter' })).rejects.toThrow('payment_unconfigured');
    } finally {
      for (const [name, value] of Object.entries({
        STRIPE_SECRET_KEY: previous.stripe,
        STRIPE_PRICE_STARTER: previous.stripePrice,
        RAZORPAY_KEY_ID: previous.razorpayId,
        RAZORPAY_KEY_SECRET: previous.razorpaySecret,
      })) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
      }
    }
  });
});
