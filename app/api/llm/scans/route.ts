import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getLLMScans, getCurrentWorkspaceId } from '@/lib/data-access';
import { scanLLM, getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import rateLimit from '@/lib/rate-limit';

// Rate limit: 20 scans per user per hour
const scanLimiter = rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    uniqueTokenPerInterval: 500,
});
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
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        const scans = await getLLMScans(workspaceId, limit);

        return NextResponse.json({ scans });
    } catch (error) {
        console.error('Error fetching LLM scans:', error);
        return NextResponse.json(
            { error: 'Failed to fetch LLM scans' },
            { status: 500 }
        );
    }
}

// POST: Run a new LLM scan
export async function POST(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'Unauthorized or no workspace found' },
                { status: 401 }
            );
        }

        // Rate limit: 20 scans per workspace per hour
        try {
            await scanLimiter.check(20, `scan-${workspaceId}`);
        } catch {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Maximum 20 scans per hour.' },
                { status: 429 }
            );
        }

        // Check usage limits
        const supabase = await createClient();
        const { data: workspaceData } = await supabase
            .from('workspaces')
            .select('org_id')
            .eq('id', workspaceId)
            .single();

        if (workspaceData?.org_id) {
            const { checkUsageLimit } = await import('@/lib/usage');
            const { allowed, limit, current } = await checkUsageLimit(workspaceData.org_id, 'scans');

            if (!allowed) {
                return NextResponse.json(
                    { error: `Plan limit reached (${current}/${limit} scans). Please upgrade your plan.` },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const { prompt, platforms, brandName, brandDomain, competitors = [], mode } = body;

        if (!prompt || !brandName) {
            return NextResponse.json(
                { error: 'prompt and brandName are required' },
                { status: 400 }
            );
        }

        // Check available platforms
        const availableInfo = getAvailablePlatforms();
        const availablePlatformIds = availableInfo.filter(p => p.available).map(p => p.platform);

        // Filter requested platforms to only those available
        const requestedPlatforms = platforms?.length > 0 ? (platforms as LLMPlatform[]) : availablePlatformIds;
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

        // Run the scan with valid platforms
        const { results, errors: scanErrors } = await scanLLM({
            prompt,
            brandName,
            brandDomain,
            competitors,
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

        // Save results to database (admin client preferred, fallback to RLS client)
        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try {
            adminClient = createAdminClient();
        } catch (error) {
            console.warn('[llm/scans] Admin client unavailable, falling back to RLS client:', error);
        }

        const db = adminClient ?? (await createClient());
        const savedScans = [];

        for (const result of results) {
            const { data, error } = await db
                .from('llm_scans')
                .insert({
                    workspace_id: workspaceId,
                    platform: result.platform === 'mock' ? 'gemini' : result.platform,
                    prompt: result.prompt,
                    response: result.response,
                    brand_mentioned: result.brandMentioned,
                    mention_position: result.mentionPosition,
                    sentiment: result.sentiment,
                    competitors_mentioned: result.competitorsMentioned,
                    citations: result.citations,
                    winner: (result as any).winner || null,
                    winner_reason: (result as any).winnerReason || null,
                })
                .select()
                .single();

            if (error) {
                console.error('Error saving scan:', error);
            } else {
                savedScans.push(data);
            }
        }

        // Fire alert evaluation asynchronously (don't await — don't slow down response)
        import('@/lib/alerts/evaluate').then(({ evaluateAlerts }) => {
            evaluateAlerts(workspaceId, results.map(r => ({
                brand_mentioned: r.brandMentioned,
                mention_position: r.mentionPosition ?? null,
                sentiment: r.sentiment || null,
                competitors_mentioned: r.competitorsMentioned || null,
                citations: r.citations || null,
                platform: r.platform,
            }))).catch(err => console.error('Alert evaluation failed:', err));
        });

        return NextResponse.json({
            success: true,
            scans: savedScans,
            results,
            platformErrors: scanErrors.length > 0 ? scanErrors : undefined,
        });
    } catch (error) {
        console.error('Error running LLM scan:', error);
        return NextResponse.json(
            { error: 'Failed to run LLM scan' },
            { status: 500 }
        );
    }
}
