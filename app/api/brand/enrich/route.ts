
import { NextRequest, NextResponse } from 'next/server';
import { enrichBrandFromUrl } from '@/lib/services/brand-enrichment';
import rateLimit from '@/lib/rate-limit';

const limiter = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        try {
            await limiter.check(5, ip);
        } catch {
            return NextResponse.json(
                { error: 'Rate limit exceeded (5 requests per hour).' },
                { status: 429 }
            );
        }

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Add protocol if missing
        let validUrl = url;
        if (!validUrl.startsWith('http')) {
            validUrl = `https://${validUrl}`;
        }

        // Validate URL format
        try {
            new URL(validUrl);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        const data = await enrichBrandFromUrl(validUrl);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Enrichment API Error:', error);
        return NextResponse.json(
            { error: 'Failed to enrich brand details' },
            { status: 500 }
        );
    }
}
