import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

// POST: Collect attribution survey response (public endpoint for embed widget)
export async function POST(request: NextRequest) {
    try {
        // This endpoint can be called from embedded widgets, so workspace comes from body
        const { workspaceId: wid, source, customSource, metadata } = await request.json();

        const workspaceId = wid || await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
        }

        // For now, we store attribution responses in workspace settings as JSON
        // In production, you'd want a dedicated table
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();

        // Get current settings
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('settings')
            .eq('id', workspaceId)
            .single();

        const settings = (workspace?.settings as Record<string, unknown>) || {};
        const responses = (settings.attribution_responses as Array<unknown>) || [];

        responses.push({
            source,
            customSource: customSource || null,
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
        });

        // Save back (keep last 1000 responses)
        const trimmedResponses = responses.slice(-1000);

        await supabase
            .from('workspaces')
            .update({
                settings: { ...settings, attribution_responses: trimmedResponses },
            })
            .eq('id', workspaceId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving attribution:', error);
        return NextResponse.json({ error: 'Failed to save attribution' }, { status: 500 });
    }
}

// GET: Get attribution summary
export async function GET() {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('settings')
            .eq('id', workspaceId)
            .single();

        const settings = (workspace?.settings as Record<string, unknown>) || {};
        const responses = (settings.attribution_responses as Array<{ source: string; timestamp: string }>) || [];

        // Aggregate by source
        const sourceCounts: Record<string, number> = {};
        let aiInfluenced = 0;

        for (const r of responses) {
            sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
            if (['chatgpt', 'gemini', 'perplexity', 'claude', 'ai_assistant', 'ai_search'].includes(r.source)) {
                aiInfluenced++;
            }
        }

        const total = responses.length;
        const sources = Object.entries(sourceCounts)
            .map(([source, count]) => ({
                source,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            }))
            .sort((a, b) => b.count - a.count);

        return NextResponse.json({
            total,
            aiInfluenced,
            aiInfluencedPercentage: total > 0 ? Math.round((aiInfluenced / total) * 100) : 0,
            sources,
            recentResponses: responses.slice(-20).reverse(),
        });
    } catch (error) {
        console.error('Error fetching attribution:', error);
        return NextResponse.json({ error: 'Failed to fetch attribution' }, { status: 500 });
    }
}
