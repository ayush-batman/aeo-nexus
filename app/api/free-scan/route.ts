import { NextRequest, NextResponse } from 'next/server';
import { scanLLM, getAvailablePlatforms, calculateVisibilityScore, LLMPlatform } from '@/lib/ai/llm-scanner';
import rateLimit from '@/lib/rate-limit';

// Rate limit: 3 scans per IP per hour
const limiter = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 500,
});

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Check rate limit (3 scans per hour)
        try {
            await limiter.check(3, ip);
        } catch {
            console.warn(`Rate limit exceeded for IP: ${ip}`);
            return NextResponse.json(
                { error: 'Rate limit exceeded. Sign up for unlimited scans!' },
                { status: 429 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const { brandName } = body;

        if (!brandName || typeof brandName !== 'string' || brandName.trim().length < 2) {
            return NextResponse.json(
                { error: 'Please enter a valid brand name (at least 2 characters)' },
                { status: 400 }
            );
        }

        const cleanBrandName = brandName.trim();

        // Get all available platforms and try each in sequence until one succeeds
        const allPlatforms = getAvailablePlatforms();
        const availablePlatforms = allPlatforms.filter(p => p.available);

        if (availablePlatforms.length === 0) {
            console.error('No LLM platforms configured with API keys');
            return NextResponse.json(
                { error: 'Service temporarily unavailable. Please try again later.' },
                { status: 503 }
            );
        }

        const scanPrompt = `What is ${cleanBrandName}? Tell me about this company/product. If you do not have specific, verifiable information about this company or it does not exist, explicitly state "I do not have information about this brand."`;
        let scanResult: any = null;
        let scanOutput: any = null;
        let platform: LLMPlatform = availablePlatforms[0].platform;

        // Try each available platform until one succeeds
        for (const p of availablePlatforms) {
            platform = p.platform;
            console.log(`Starting free scan for brand: "${cleanBrandName}" on ${platform} (IP: ${ip})`);

            scanOutput = await scanLLM({
                prompt: scanPrompt,
                brandName: cleanBrandName,
                platforms: [platform],
            });

            scanResult = scanOutput.results[0];
            if (scanResult) break;

            console.warn(`Platform ${platform} failed, trying next available...`);
        }

        // Final fallback to mock in dev
        if (!scanResult) {
            const allowMock = process.env.ALLOW_MOCK_LLM === 'true' || process.env.NODE_ENV !== 'production';
            if (allowMock) {
                platform = 'mock';
                scanOutput = await scanLLM({
                    prompt: scanPrompt,
                    brandName: cleanBrandName,
                    platforms: ['mock'],
                });
                scanResult = scanOutput.results[0];
            }
        }

        if (!scanResult) {
            console.error(`Scan failed for brand: ${cleanBrandName} - All platforms failed`);
            return NextResponse.json(
                { error: 'All AI platforms are currently unavailable. Please try again later.' },
                { status: 503 }
            );
        }

        const visibilityScore = calculateVisibilityScore(scanOutput.results);

        return NextResponse.json({
            platform: scanResult.platform,
            mentioned: scanResult.brandMentioned,
            sentiment: scanResult.sentiment || 'neutral',
            visibilityScore,
            // Truncate response for free tier
            snippet: scanResult.response?.substring(0, 200) + '...',
            // Teaser data
            limitedView: true,
            message: 'Sign up to see full analysis, track over time, and scan all AI platforms!',
        });
    } catch (error) {
        console.error('Free scan error:', error);
        return NextResponse.json(
            { error: 'Scan failed. Please try again.' },
            { status: 500 }
        );
    }
}
