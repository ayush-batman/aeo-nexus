import { NextRequest, NextResponse } from 'next/server';
import { getLLMScans, getCurrentWorkspaceId } from '@/lib/data-access';
import { POST as runCanonicalScan } from '../scan/route';
import { convexRouteError } from '@/lib/convex/http';

export const maxDuration = 300;
// GET: Fetch recent LLM scans
export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const limit    = parseInt(searchParams.get('limit') || '20', 10);
        const platform = searchParams.get('platform') || undefined;

        const scans = await getLLMScans(workspaceId, limit, { platform });

        return NextResponse.json({ scans });
    } catch (error) {
        return convexRouteError(error);
    }
}

// POST: Run a new LLM scan
export async function POST(request: NextRequest) {
    return runCanonicalScan(request);
}
