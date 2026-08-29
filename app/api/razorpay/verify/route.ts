import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import {
    validateRazorpayPayment,
    verifyRazorpayPaymentSignature,
    type RazorpayOrderLike,
    type RazorpayPaymentLike,
} from '@/lib/billing/razorpay';
import { applyBillingEvent } from '@/lib/billing/webhook-events';

export async function POST(request: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        const razorpay_order_id = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
        const razorpay_payment_id = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
        const razorpay_signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature : '';
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            return NextResponse.json({ error: 'Payment verification is not configured' }, { status: 503 });
        }
        if (!verifyRazorpayPaymentSignature({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            secret: keySecret,
        })) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
        const [paymentResult, orderResult] = await Promise.all([
            razorpay.payments.fetch(razorpay_payment_id),
            razorpay.orders.fetch(razorpay_order_id),
        ]);
        const validated = validateRazorpayPayment({
            payment: paymentResult as unknown as RazorpayPaymentLike,
            order: orderResult as unknown as RazorpayOrderLike,
        });
        if (validated.orgId !== context.orgId) {
            return NextResponse.json({ error: 'Order org mismatch' }, { status: 403 });
        }

        const applied = await applyBillingEvent({
            provider: 'razorpay',
            eventId: `payment:${validated.paymentId}`,
            eventType: 'client.payment.verified',
            orgId: validated.orgId,
            plan: validated.plan,
            subscriptionId: validated.paymentId,
        });

        return NextResponse.json({ success: true, plan: validated.plan, duplicate: !applied });
    } catch (error) {
        console.error('[razorpay/verify]', error);
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
    }
}
