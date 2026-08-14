import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_DB_PLANS = new Set(['starter', 'pro', 'agency', 'enterprise']);

export async function POST(request: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
        }

        // 1. Verify the signature (proves the payment is genuine).
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        if (expected !== razorpay_signature) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // 2. Read the plan + org from the ORDER itself (authoritative), never
        //    from the client, so a user cannot pay for Radar and claim Command.
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const notes = (order.notes ?? {}) as Record<string, string>;
        const dbPlan = notes.db_plan;
        const orderOrgId = notes.org_id;

        if (!dbPlan || !VALID_DB_PLANS.has(dbPlan)) {
            return NextResponse.json({ error: 'Order missing valid plan' }, { status: 400 });
        }
        // The order must belong to the authenticated user's org.
        if (orderOrgId && orderOrgId !== context.orgId) {
            return NextResponse.json({ error: 'Order org mismatch' }, { status: 403 });
        }

        // 3. Apply the plan.
        const db = createAdminClient();
        const { error } = await db
            .from('organizations')
            .update({ plan: dbPlan, razorpay_subscription_id: razorpay_payment_id })
            .eq('id', context.orgId);
        if (error) {
            console.error('[razorpay/verify] plan update failed', error);
            return NextResponse.json({ error: 'Could not apply plan' }, { status: 500 });
        }

        return NextResponse.json({ success: true, plan: dbPlan });
    } catch (error) {
        console.error('[razorpay/verify]', error);
        return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
    }
}
