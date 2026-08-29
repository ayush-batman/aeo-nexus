import { NextResponse } from 'next/server';
import { AnalyticsIngestConfigurationError, createAnalyticsIngestToken } from '@/lib/analytics-ingest';
import { getCurrentWorkspaceId } from '@/lib/data-access';

export async function GET() {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        return NextResponse.json({ ingestToken: createAnalyticsIngestToken(workspaceId) });
    } catch (error) {
        if (error instanceof AnalyticsIngestConfigurationError) {
            return NextResponse.json({ error: 'Analytics ingestion is not configured.' }, { status: 503 });
        }
        console.error('[analytics/install-token] failed:', error);
        return NextResponse.json({ error: 'Could not create install token.' }, { status: 500 });
    }
}
