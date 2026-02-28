import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardStats, getRecentMentions, getVisibilityMetrics, getCurrentWorkspaceId } from '@/lib/data-access';

export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        const [stats, recentMentions, visibilityMetrics] = await Promise.all([
            getDashboardStats(workspaceId),
            getRecentMentions(workspaceId, 5),
            getVisibilityMetrics(workspaceId),
        ]);

        return NextResponse.json({
            stats,
            recentMentions,
            visibilityMetrics,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
