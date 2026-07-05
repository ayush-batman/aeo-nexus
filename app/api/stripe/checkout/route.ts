import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

function getStripe() {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
    }
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-01-27.acacia',
    } as any);
}

// Stripe price IDs - configure these in your Stripe dashboard
const PRICE_IDS: Record<string, string> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    agency: process.env.STRIPE_AGENCY_PRICE_ID || 'price_agency',
};

export async function POST(request: NextRequest) {
    try {
        // Route through the shared context helper so dev-auth-bypass works
        // here — same fix pattern as the /api/workspaces endpoints.
        const context = await getCurrentWorkspaceContext();
        if (!context) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { plan } = await request.json();
        if (!plan || !PRICE_IDS[plan]) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
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

            await db
                .from('organizations')
                .update({ stripe_customer_id: customerId })
                .eq('id', context.orgId);
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
            mode: 'subscription',
            success_url: `${request.nextUrl.origin}/dashboard/settings?success=true`,
            cancel_url:  `${request.nextUrl.origin}/dashboard/settings?canceled=true`,
            metadata: {
                org_id: context.orgId,
                plan,
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
