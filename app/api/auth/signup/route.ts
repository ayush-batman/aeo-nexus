import { NextRequest, NextResponse } from 'next/server';
import { handler } from '@/lib/auth-server';

/** Compatibility URL. Better Auth owns account creation and email verification. */
export async function POST(request: NextRequest) {
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || typeof body.email !== 'string' || typeof body.password !== 'string' ||
        body.password.length < 8 || typeof body.fullName !== 'string' || !body.fullName.trim()) {
        return NextResponse.json({ error: 'Name, email and a password of at least 8 characters are required' }, { status: 400 });
    }
    const plan = body.selectedPlan === 'radar' || body.selectedPlan === 'command' ? body.selectedPlan : null;
    const headers = new Headers(request.headers);
    headers.set('content-type', 'application/json');
    headers.delete('content-length');
    return handler.POST(new NextRequest(new URL('/api/auth/sign-up/email', request.url), {
        method: 'POST', headers,
        body: JSON.stringify({ name: body.fullName.trim(), email: body.email.trim(), password: body.password,
            callbackURL: plan ? `/onboarding?plan=${plan}` : '/onboarding' }),
    }));
}
