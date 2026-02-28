import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text(); // Get raw body for signature verification
        let payload;
        try {
            payload = JSON.parse(bodyText);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const signature = req.headers.get('x-razorpay-signature');
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify webhook signature if secret is configured
        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(bodyText)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.error('Invalid Razorpay webhook signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
            }
        } else if (!webhookSecret) {
            console.warn('RAZORPAY_WEBHOOK_SECRET is not configured. Processing without signature validation (DANGEROUS IN PROD).');
        }

        // Process Event
        const eventType = payload.event;
        const supabase = createAdminClient();

        console.log(`[Webhook] Received Razorpay event: ${eventType}`);

        if (eventType === 'payment.captured' || eventType === 'order.paid') {
            const paymentEntity = payload.payload.payment.entity;
            const orderId = paymentEntity.order_id;

            // To ensure safe server-to-server plan updates, we need a way to link an order_id back to an org_id.
            // In checkout, we currently rely on the client sending `org_id` during the manual verification step.
            // Note: Make sure to attach `notes: { org_id: string, plan: string }` during order creation in `app/api/razorpay/create-order`
            const notes = paymentEntity.notes || {};
            const orgId = notes.org_id;
            const plan = notes.plan || 'pro'; // fallback or exact match

            if (orgId) {
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        plan: plan,
                        razorpay_subscription_id: paymentEntity.id,
                    })
                    .eq('id', orgId);

                if (error) {
                    console.error('[Webhook] Failed to update organization plan:', error);
                    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
                }

                console.log(`[Webhook] Successfully updated Org ${orgId} to plan ${plan}`);
            } else {
                console.warn('[Webhook] No org_id found in payment notes. Skipping plan update.');
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Webhook] Error processing Razorpay payload:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
