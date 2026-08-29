import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getStripePriceForPlan, isBillablePlan } from '@/lib/billing/plans';

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: NextRequest) {
    try {
        // Route through the shared context helper so dev-auth-bypass works
        // here, same fix pattern as the /api/workspaces endpoints.
        const context = await getCurrentWorkspaceContext();
        if (!context) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null) as { plan?: unknown } | null;
        const plan = body?.plan;
        if (!isBillablePlan(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }
        const priceId = getStripePriceForPlan(plan, process.env);
        if (!priceId) {
            return NextResponse.json({ error: 'payment_unconfigured' }, { status: 503 });
        }

        const db = createAdminClient();

        // Look up the user's email + org's saved stripe customer id.
        const [{ data: userRow }, { data: orgRow }] = await Promise.all([
            db.from('users').select('email').eq('id', context.userId).single(),
            db.from('organizations').select('stripe_customer_id').eq('id', context.orgId).single(),
        ]);

        let customerId = orgRow?.stripe_customer_id;
        const stripe = getStripe();

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userRow?.email ?? undefined,
                metadata: {
                    org_id: context.orgId,
                    user_id: context.userId,
                },
            });
            customerId = customer.id;

            const { error: customerUpdateError } = await db
                .from('organizations')
                .update({ stripe_customer_id: customerId })
                .eq('id', context.orgId);
            if (customerUpdateError) throw customerUpdateError;
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${request.nextUrl.origin}/dashboard/settings?success=true`,
            cancel_url:  `${request.nextUrl.origin}/dashboard/settings?canceled=true`,
            metadata: {
                org_id: context.orgId,
                plan,
            },
            subscription_data: {
                metadata: { org_id: context.orgId },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
