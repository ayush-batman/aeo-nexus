import { NextResponse } from 'next/server';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  // Preserve the raw body: signature verification and provider calls run in Convex.
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 750_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  try {
    return NextResponse.json(await callInternal('action', internal.billingActions.stripeWebhook, { body, signature }));
  } catch (error) {
    const invalid = error instanceof Error && error.message === 'invalid_signature';
    return NextResponse.json({ error: invalid ? 'Invalid signature' : 'Webhook could not be processed; retry required' }, { status: invalid ? 400 : 503 });
  }
}
