import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

// Marks the current user's onboarding as complete.
// Runs server-side so the write goes through the service role (with an RLS
// fallback) instead of a client-side update that can silently no-op under RLS
// and leave onboarding_completed stuck at false.
export async function POST() {
    try {
        const context = await getCurrentWorkspaceContext();

        if (!context) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try {
            adminClient = createAdminClient();
        } catch (error) {
            console.warn('[onboarding/complete] Admin client unavailable, falling back to RLS client:', error);
        }

        const db = adminClient ?? (await createClient());

        const { error } = await db
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', context.userId);

        if (error) {
            console.error('[onboarding/complete] Failed to mark onboarding complete:', error);
            return NextResponse.json(
                { error: 'Failed to complete onboarding' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Onboarding complete error:', error);
        return NextResponse.json(
            { error: 'Failed to complete onboarding' },
            { status: 500 }
        );
    }
}
