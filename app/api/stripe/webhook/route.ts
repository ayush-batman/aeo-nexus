import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripePlanFromPrice } from '@/lib/billing/plans';
import { applyBillingEvent } from '@/lib/billing/webhook-events';

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function subscriptionId(value: string | Stripe.Subscription | null): string | null {
    if (typeof value === 'string') return value;
    return value?.id ?? null;
}

function subscriptionPriceId(subscription: Stripe.Subscription): string | null {
    return subscription.items.data[0]?.price.id ?? null;
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('Stripe webhook secret not configured');
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }
    if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json(
            { error: 'Invalid signature' },
            { status: 400 }
        );
    }

    const admin = createAdminClient();
    const occurredAt = new Date(event.created * 1000).toISOString();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.org_id;
                const id = subscriptionId(session.subscription);
                if (!orgId || !id) throw new Error('Checkout session is missing organization or subscription');
                if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
                    throw new Error('Checkout session payment is not complete');
                }
                const subscription = await getStripe().subscriptions.retrieve(id);
                if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                    throw new Error('Stripe subscription is not active');
                }
                if (subscription.metadata.org_id && subscription.metadata.org_id !== orgId) {
                    throw new Error('Stripe subscription organization mismatch');
                }
                const plan = getStripePlanFromPrice(subscriptionPriceId(subscription), process.env);
                if (!plan) throw new Error('Stripe subscription uses an unknown price');
                await applyBillingEvent({
                    provider: 'stripe', eventId: event.id, eventType: event.type,
                    orgId, plan, subscriptionId: id, occurredAt,
                });
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;

                const orgQuery = admin.from('organizations').select('id');
                const { data: org, error: orgError } = subscription.metadata.org_id
                    ? await orgQuery.eq('id', subscription.metadata.org_id).single()
                    : await orgQuery.eq('stripe_subscription_id', subscription.id).single();
                if (orgError || !org) throw new Error('Stripe subscription organization was not found');
                const active = subscription.status === 'active' || subscription.status === 'trialing';
                const plan = active
                    ? getStripePlanFromPrice(subscriptionPriceId(subscription), process.env)
                    : 'free';
                if (!plan) throw new Error('Stripe subscription uses an unknown price');
                await applyBillingEvent({
                    provider: 'stripe', eventId: event.id, eventType: event.type,
                    orgId: org.id, plan,
                    subscriptionId: active ? subscription.id : null,
                    occurredAt,
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                const orgQuery = admin.from('organizations').select('id');
                const { data: org, error: orgError } = subscription.metadata.org_id
                    ? await orgQuery.eq('id', subscription.metadata.org_id).single()
                    : await orgQuery.eq('stripe_subscription_id', subscription.id).single();
                if (orgError || !org) throw new Error('Stripe subscription organization was not found');
                await applyBillingEvent({
                    provider: 'stripe', eventId: event.id, eventType: event.type,
                    orgId: org.id, plan: 'free', subscriptionId: null, occurredAt,
                });
                break;
            }
            default:
                return NextResponse.json({ received: true, ignored: true });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}
