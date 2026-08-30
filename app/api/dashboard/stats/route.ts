import { NextResponse } from 'next/server';
import { getDashboardStats, getRecentMentions, getVisibilityMetrics, getCurrentWorkspaceId } from '@/lib/data-access';

export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        const visibilityMetrics = await getVisibilityMetrics(workspaceId);
        const [stats, recentMentions] = await Promise.all([
            getDashboardStats(workspaceId, visibilityMetrics),
            getRecentMentions(workspaceId, 5),
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
