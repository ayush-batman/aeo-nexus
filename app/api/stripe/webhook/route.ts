import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-01-27.acacia',
    } as any);
}

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('Stripe webhook secret not configured');
        return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
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

    const supabase = await createClient();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const orgId = session.metadata?.org_id;
                const plan = session.metadata?.plan;

                if (orgId && plan) {
                    // Update organization plan
                    await supabase
                        .from('organizations')
                        .update({
                            plan,
                            stripe_subscription_id: session.subscription as string,
                        })
                        .eq('id', orgId);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;

                // Find org by subscription ID
                const { data: org } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (org) {
                    // Check if subscription is active or cancelled
                    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

                    if (!isActive) {
                        // Downgrade to free plan
                        await supabase
                            .from('organizations')
                            .update({ plan: 'free' })
                            .eq('id', org.id);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                // Find org by subscription ID and downgrade to free
                const { data: org } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (org) {
                    await supabase
                        .from('organizations')
                        .update({
                            plan: 'free',
                            stripe_subscription_id: null,
                        })
                        .eq('id', org.id);
                }
                break;
            }
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
