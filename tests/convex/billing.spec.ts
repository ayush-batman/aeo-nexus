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
      await expect(owner.action(api.billingActions.razorpayOrder, { plan: 'starter' })).rejects.toThrow('payment_unconfigured');
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
