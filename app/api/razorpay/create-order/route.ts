import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@/lib/supabase/server';

// Plan prices in paise (INR)
const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
    starter: { amount: 249900, name: 'Starter Plan' }, // ₹2,499/month
    pro: { amount: 799900, name: 'Pro Plan' }, // ₹7,999/month
    agency: { amount: 1999900, name: 'Agency Plan' }, // ₹19,999/month
};

function getRazorpay() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return null;
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

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

        if (!plan || !PLAN_PRICES[plan]) {
            return NextResponse.json(
                { error: 'Invalid plan' },
                { status: 400 }
            );
        }

        const planDetails = PLAN_PRICES[plan];
        const razorpay = getRazorpay();

        if (!razorpay) {
            console.error('Razorpay keys not configured');
            return NextResponse.json(
                { error: 'Payment system configuration pending. Please contact support.' },
                { status: 503 }
            );
        }

        // Get user's organization
        const { data: userData } = await supabase
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single();

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: planDetails.amount,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
            notes: {
                org_id: userData?.org_id || '',
                plan,
                user_id: user.id,
                user_email: user.email || '',
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            plan: planDetails.name,
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create order' },
            { status: 500 }
        );
    }
}
