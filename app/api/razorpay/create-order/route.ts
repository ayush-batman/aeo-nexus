import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getRazorpayPlan } from '@/lib/billing/plans';

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

        const body = await request.json().catch(() => null) as { plan?: unknown } | null;
        const plan = body?.plan;
        const details = getRazorpayPlan(plan);
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
            currency: details.currency,
            receipt: `ord_${Date.now()}`,
            notes: {
                org_id: context.orgId,
                user_id: context.userId,
                db_plan: details.dbPlan,   // authoritative plan, read back on verify
                display_plan: typeof plan === 'string' ? plan : details.dbPlan,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            planName: details.displayName,
            plan: details.displayName, // back-compat for the settings billing grid
        });
    } catch (error) {
        console.error('[razorpay/create-order]', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}
