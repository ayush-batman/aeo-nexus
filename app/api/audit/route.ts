import { NextRequest, NextResponse } from 'next/server';
import { auditContent } from '@/lib/ai/content-analyzer';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            return NextResponse.json(
                { error: 'Invalid URL format' },
                { status: 400 }
            );
        }

        const result = await auditContent(url);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Audit API Error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze URL' },
            { status: 500 }
        );
    }
}
