import { NextRequest, NextResponse } from 'next/server';
import { scanLLM, calculateVisibilityScore, getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';

export const maxDuration = 60; // Max timeout for Vercel

export async function POST(request: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { prompt, brandName, brandDomain, competitors, platforms, mode } = body;

        if (!prompt || !brandName) {
            return NextResponse.json(
                { error: 'prompt and brandName are required' },
                { status: 400 }
            );
        }

        const availableInfo = getAvailablePlatforms();
        const availablePlatformIds = availableInfo.filter(p => p.available).map(p => p.platform);
        const requestedPlatforms = (platforms as LLMPlatform[]) || availablePlatformIds;
        let validPlatforms = requestedPlatforms.filter(p => availablePlatformIds.includes(p));

        if (validPlatforms.length === 0) {
            return NextResponse.json(
                {
                    error: 'No configured LLM platforms found. Please set API keys in .env.local.',
                    available: availableInfo
                },
                { status: 400 }
            );
        }

        const { results, errors: scanErrors } = await scanLLM({
            prompt,
            brandName,
            brandDomain,
            competitors: competitors || [],
            platforms: validPlatforms,
            mode,
        });

        if (!results || results.length === 0) {
            return NextResponse.json(
                {
                    error: 'All LLM platforms failed. Check API keys.',
                    platformErrors: scanErrors,
                },
                { status: 500 }
            );
        }

        // Persist results to Supabase
        const { createAdminClient } = await import('@/lib/supabase/admin');
        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try {
            adminClient = createAdminClient();
        } catch (error) {
            console.warn('[llm/scan] Admin client unavailable, falling back to RLS client:', error);
        }
        
        const db = adminClient ?? (await createClient());

        const scanInserts = results.map(r => ({
            workspace_id: context.workspaceId,
            platform: r.platform === 'mock' ? 'gemini' : r.platform,
            prompt: r.prompt,
            response: r.response,
            brand_mentioned: r.brandMentioned,
            brand_variants: r.brandVariants,
            mention_position: r.mentionPosition,
            sentiment: r.sentiment,
            sentiment_score: r.sentimentScore,
            sentiment_reason: r.sentimentReason,
            competitors_mentioned: r.competitorsMentioned,
            citations: r.citations,
            list_items: r.listItems,
            confidence: r.confidence,
            // created_at is default
        }));

        const { error: insertError } = await db
            .from('llm_scans')
            .insert(scanInserts);

        if (insertError) {
            console.error('Failed to save scans to DB:', insertError);
            // Don't fail the request, just log it
        }

        // Calculate overall visibility score
        const visibilityScore = calculateVisibilityScore(results);

        return NextResponse.json({
            success: true,
            results,
            visibilityScore,
            scannedAt: new Date().toISOString(),
            platformErrors: scanErrors.length > 0 ? scanErrors : undefined,
        });
    } catch (error) {
        console.error('LLM scan error:', error);
        return NextResponse.json(
            { error: 'Failed to scan LLM platforms' },
            { status: 500 }
        );
    }
}
