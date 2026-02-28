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

// Stripe price IDs - configure these in your Stripe dashboard
const PRICE_IDS: Record<string, string> = {
    starter: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter',
    pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    agency: process.env.STRIPE_AGENCY_PRICE_ID || 'price_agency',
};

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { plan } = await request.json();

        if (!plan || !PRICE_IDS[plan]) {
            return NextResponse.json(
                { error: 'Invalid plan' },
                { status: 400 }
            );
        }

        // Get user's organization
        const { data: userData } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single();

        // Get organization's stripe customer ID
        const { data: orgData } = userData?.org_id ? await supabase
            .from('organizations')
            .select('stripe_customer_id')
            .eq('id', userData.org_id)
            .single() : { data: null };

        let customerId = orgData?.stripe_customer_id;
        const stripe = getStripe();

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    org_id: userData?.org_id || '',
                    user_id: user.id,
                },
            });
            customerId = customer.id;

            // Save customer ID to organization
            if (userData?.org_id) {
                await supabase
                    .from('organizations')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', userData.org_id);
            }
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: PRICE_IDS[plan],
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${request.nextUrl.origin}/dashboard/settings?success=true`,
            cancel_url: `${request.nextUrl.origin}/dashboard/settings?canceled=true`,
            metadata: {
                org_id: userData?.org_id || '',
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
