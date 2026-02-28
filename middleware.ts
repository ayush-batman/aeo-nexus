import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // Dev Auth Bypass: If enabled in env and cookie set, skip Supabase auth
    const isDevBypassEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === 'true';
    const hasBypassCookie = request.cookies.get('dev-auth-bypass')?.value === 'true';

    let response: NextResponse;

    if (isDevBypassEnabled && hasBypassCookie) {
        response = NextResponse.next();
    } else {
        response = await updateSession(request);
    }

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
