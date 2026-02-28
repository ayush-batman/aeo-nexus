import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

export async function GET(request: NextRequest) {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch analytics for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('created_at', thirtyDaysAgo);

    if (error) {
        console.error('Analytics Query Error:', error);
        // If table doesn't exist yet (migration not run), return empty data gracefully
        if (error.code === '42P01') {
            return NextResponse.json({ totalVisits: 0, aiVisits: 0, sources: {} });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process data
    const events = data || [];
    const totalVisits = events.length;

    // Filter for AI sources
    const aiSources = ['chatgpt', 'gemini', 'perplexity', 'claude', 'bing', 'copilot'];
    const aiVisits = events.filter(e => aiSources.includes(e.ai_source)).length;

    const sources = events.reduce((acc, curr) => {
        const src = curr.ai_source || 'direct';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
        totalVisits,
        aiVisits,
        sources,
        events: events.slice(0, 50) // Return recent events for list view
    });
}
