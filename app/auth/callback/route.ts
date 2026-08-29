import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const selectedPlan = searchParams.get('plan');

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('Auth callback error:', error);
            return NextResponse.redirect(`${origin}/login?error=callback_failed`);
        }
        if (selectedPlan === 'radar' || selectedPlan === 'command') {
            const { error: metadataError } = await supabase.auth.updateUser({ data: { selected_plan: selectedPlan } });
            if (metadataError) console.error('Could not preserve selected plan after OAuth:', metadataError);
        }
    }

    const next = new URL('/dashboard', origin);
    if (selectedPlan === 'radar' || selectedPlan === 'command') next.searchParams.set('plan', selectedPlan);
    return NextResponse.redirect(next);
}
