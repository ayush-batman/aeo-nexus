import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import {
    extractRazorpayPaymentId,
    validateRazorpayPayment,
    verifyRazorpayWebhookSignature,
    type RazorpayOrderLike,
    type RazorpayPaymentLike,
} from '@/lib/billing/razorpay';
import { applyBillingEvent } from '@/lib/billing/webhook-events';

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text(); // Get raw body for signature verification
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers.get('x-razorpay-signature');
        if (!webhookSecret) {
            return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
        }
        if (!verifyRazorpayWebhookSignature(bodyText, signature, webhookSecret)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        let payload: unknown;
        try {
            payload = JSON.parse(bodyText);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        if (!payload || typeof payload !== 'object') {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }
        const eventType = (payload as Record<string, unknown>).event;
        if (eventType !== 'payment.captured' && eventType !== 'order.paid') {
            return NextResponse.json({ received: true, ignored: true });
        }

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            return NextResponse.json({ error: 'Provider verification is not configured' }, { status: 503 });
        }
        const paymentId = extractRazorpayPaymentId(payload);
        if (!paymentId) {
            return NextResponse.json({ error: 'Payment is missing' }, { status: 400 });
        }

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        const paymentResult = await razorpay.payments.fetch(paymentId);
        const payment = paymentResult as unknown as RazorpayPaymentLike;
        const orderResult = await razorpay.orders.fetch(payment.order_id);
        const validated = validateRazorpayPayment({
            payment,
            order: orderResult as unknown as RazorpayOrderLike,
        });
        const applied = await applyBillingEvent({
            provider: 'razorpay',
            eventId: `payment:${validated.paymentId}`,
            eventType,
            orgId: validated.orgId,
            plan: validated.plan,
            subscriptionId: validated.paymentId,
        });

        return NextResponse.json({ received: true, duplicate: !applied });
    } catch (err) {
        console.error('[Webhook] Error processing Razorpay payload:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
