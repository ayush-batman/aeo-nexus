import { NextRequest, NextResponse } from 'next/server';
import { scanLLM, calculateVisibilityScore, type LLMPlatform } from '@/lib/ai/llm-scanner';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, brandName, brandDomain, competitors, platforms } = body;

        if (!prompt || !brandName) {
            return NextResponse.json(
                { error: 'prompt and brandName are required' },
                { status: 400 }
            );
        }

        // Run the scan
        const results = await scanLLM({
            prompt,
            brandName,
            brandDomain,
            competitors: competitors || [],
            platforms: (platforms as LLMPlatform[]) || ['gemini'],
        });

        // Calculate overall visibility score
        const visibilityScore = calculateVisibilityScore(results);

        return NextResponse.json({
            success: true,
            results,
            visibilityScore,
            scannedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('LLM scan error:', error);
        return NextResponse.json(
            { error: 'Failed to scan LLM platforms' },
            { status: 500 }
        );
    }
}
