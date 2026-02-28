import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

export async function GET() {
    try {
        const context = await getCurrentWorkspaceContext();

        if (!context) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        const supabase = await createClient();
        const { count, error } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', context.workspaceId);

        if (error) {
            console.error('Onboarding context error:', error);
            return NextResponse.json(
                { error: 'Failed to load onboarding context' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            userId: context.userId,
            orgId: context.orgId,
            workspaceId: context.workspaceId,
            onboardingCompleted: context.onboardingCompleted,
            hasBrand: (count || 0) > 0,
        });
    } catch (error) {
        console.error('Onboarding context error:', error);
        return NextResponse.json(
            { error: 'Failed to load onboarding context' },
            { status: 500 }
        );
    }
}
