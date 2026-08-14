import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

// Self-serve plans. Accepts both the marketing keys (radar/command) and the DB
// keys (starter/pro/agency) so the pricing page, the upgrade modal, and the
// settings billing grid all work. dbPlan is written to organizations.plan.
// Amounts are in paise and MUST equal the price shown on /pricing.
const PLANS: Record<string, { amount: number; name: string; dbPlan: string }> = {
    radar:     { amount: 499900,  name: 'Radar',     dbPlan: 'starter' }, // ₹4,999
    starter:   { amount: 499900,  name: 'Radar',     dbPlan: 'starter' },
    command:   { amount: 1499900, name: 'Command',   dbPlan: 'pro' },     // ₹14,999
    pro:       { amount: 1499900, name: 'Command',   dbPlan: 'pro' },
    concierge: { amount: 5000000, name: 'Concierge', dbPlan: 'agency' },  // ₹50,000
    agency:    { amount: 5000000, name: 'Concierge', dbPlan: 'agency' },
};

function getRazorpay() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
}

export async function POST(request: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { plan } = await request.json();
        const details = PLANS[plan as string];
        if (!details) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const razorpay = getRazorpay();
        if (!razorpay || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            return NextResponse.json(
                { error: 'payment_unconfigured', message: 'Payments are not set up yet. Please contact us to upgrade.' },
                { status: 503 }
            );
        }

        const order = await razorpay.orders.create({
            amount: details.amount,
            currency: 'INR',
            receipt: `ord_${Date.now()}`,
            notes: {
                org_id: context.orgId,
                user_id: context.userId,
                db_plan: details.dbPlan,   // authoritative plan, read back on verify
                display_plan: plan,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            planName: details.name,
            plan: details.name, // back-compat for the settings billing grid
        });
    } catch (error) {
        console.error('[razorpay/create-order]', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
