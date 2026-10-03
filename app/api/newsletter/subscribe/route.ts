import { NextResponse } from 'next/server';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { convexRouteError } from '@/lib/convex/http';
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
      (body.source !== undefined && typeof body.source !== 'string')) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    await callInternal('action', internal.newsletterActions.subscribe, { email: body.email.trim().toLowerCase(), source: body.source?.trim().slice(0,40) || null,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown' });
    // Same response for all addresses: do not disclose existing subscribers.
    return NextResponse.json({ ok: true, status: 'subscribed' });
  } catch (error) { return convexRouteError(error); }
}
