import { NextRequest, NextResponse } from 'next/server';
import {
    AnalyticsIngestConfigurationError,
    AnalyticsInputError,
    normalizeAnalyticsEvent,
    readBoundedJson,
    verifyAnalyticsIngestToken,
} from '@/lib/analytics-ingest';
import rateLimit, { isRateLimitUnavailableError } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 10_000, namespace: 'analytics-ingest' });
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: Record<string, unknown>, status = 200, extraHeaders?: Record<string, string>) {
    return NextResponse.json(body, { status, headers: { ...CORS_HEADERS, ...extraHeaders } });
}

function clientIp(request: NextRequest): string {
    return (request.headers.get('x-forwarded-for')?.split(',')[0]
        || request.headers.get('x-real-ip')
        || 'unknown').trim().slice(0, 128);
}

export async function POST(request: NextRequest) {
    try {
        const body = await readBoundedJson(request, 16_384);
        const record = body as Record<string, unknown>;
        const event = normalizeAnalyticsEvent(body);

        try {
            await limiter.check(600, `ip:${clientIp(request)}`);
        } catch (error) {
            if (isRateLimitUnavailableError(error)) return json({ error: 'Ingestion protection is unavailable.' }, 503, { 'Retry-After': '60' });
            return json({ error: 'Rate limit exceeded.' }, 429, { 'Retry-After': '60' });
        }

        const ingestToken = record.ingest_token;
        if (!verifyAnalyticsIngestToken(event.workspace_id, ingestToken)) {
            return json({ error: 'Invalid analytics ingest token.' }, 401);
        }

        try {
            await limiter.check(2_000, `token:${ingestToken}`);
        } catch (error) {
            if (isRateLimitUnavailableError(error)) return json({ error: 'Ingestion protection is unavailable.' }, 503, { 'Retry-After': '60' });
            return json({ error: 'Workspace event rate limit exceeded.' }, 429, { 'Retry-After': '60' });
        }

        const admin = createAdminClient();
        const { error } = await admin.from('analytics_events').insert(event);
        if (error) {
            console.error('[analytics/track] insert failed:', error);
            return json({ error: 'Failed to record event.' }, 500);
        }
        return json({ success: true }, 202);
    } catch (error) {
        if (error instanceof AnalyticsInputError) return json({ error: error.message }, error.status);
        if (error instanceof AnalyticsIngestConfigurationError) {
            console.error('[analytics/track] signing secret is not configured');
            return json({ error: 'Analytics ingestion is not configured.' }, 503);
        }
        console.error('[analytics/track] unexpected error:', error);
        return json({ error: 'Internal Server Error' }, 500);
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
