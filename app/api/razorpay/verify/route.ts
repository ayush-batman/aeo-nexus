import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthAction } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
export async function POST(request: Request) {
  try {
    if (!await getConvexWorkspaceContext()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!body || ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature'].some(key => typeof body[key] !== 'string' || !body[key])) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
    }
    return NextResponse.json(await fetchAuthAction(api.billingActions.razorpayVerify, {
      orderId: body.razorpay_order_id, paymentId: body.razorpay_payment_id, signature: body.razorpay_signature,
    }));
  } catch (error) { return convexRouteError(error); }
}
