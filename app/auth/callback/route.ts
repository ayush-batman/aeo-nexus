import { NextRequest, NextResponse } from 'next/server';
import { getToken, fetchAuthMutation } from '@/lib/auth-server';
import { api } from '@/convex/_generated/api';

export async function GET(request: NextRequest) {
    const next = new URL('/dashboard', request.url);
    const selectedPlan = request.nextUrl.searchParams.get('plan');
    try {
        if (!await getToken()) return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
        const user = await fetchAuthMutation(api.users.provisionCurrentUser, {});
        if (!user.onboardingCompleted) next.pathname = '/onboarding';
        if (selectedPlan === 'radar' || selectedPlan === 'command') next.searchParams.set('plan', selectedPlan);
        return NextResponse.redirect(next);
    } catch {
        return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
    }
}
