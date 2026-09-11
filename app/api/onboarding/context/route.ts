import { NextResponse } from 'next/server';
import { getConvexDashboardBootstrap } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';

export async function GET() {
    try {
        const context = await getConvexDashboardBootstrap();

        if (!context) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        return NextResponse.json(context);
    } catch (error) {
        return convexRouteError(error);
    }
}
