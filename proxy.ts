import { type NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function proxy(request: NextRequest) {
    const protectedPath = ['/dashboard', '/onboarding', '/admin'].some((path) =>
        request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
    const developmentBypass = process.env.NODE_ENV !== 'production'
        && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === 'true'
        && ['localhost', '127.0.0.1'].includes(request.nextUrl.hostname)
        && request.cookies.get('dev-auth-bypass')?.value === 'true';
    // Only a navigation hint. Every data request verifies the actual session
    // and tenant in Convex; a forged cookie never grants access.
    const response = protectedPath && !getSessionCookie(request) && !developmentBypass
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
