import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 60; // Extend Vercel timeout for initial LLMs scale

// GET: List all workspaces for the current user's org
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try { adminClient = createAdminClient(); } catch {}
        const db = adminClient ?? supabase;

        const { data: profile } = await db
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single();

        if (!profile?.org_id) {
            return NextResponse.json({ workspaces: [] });
        }

        const { data: workspaces } = await db
            .from('workspaces')
            .select('id, name, settings, created_at')
            .eq('org_id', profile.org_id)
            .order('created_at', { ascending: true });

        return NextResponse.json({ workspaces: workspaces || [] });
    } catch (error) {
        console.error('Error fetching workspaces:', error);
        return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }
}

// POST: Create a new workspace (brand)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let adminClient: ReturnType<typeof createAdminClient> | null = null;
        try { adminClient = createAdminClient(); } catch {}
        const db = adminClient ?? supabase;

        const { data: profile } = await db
            .from('users')
            .select('org_id')
            .eq('id', user.id)
            .single();

        if (!profile?.org_id) {
            return NextResponse.json({ error: 'No organization found' }, { status: 400 });
        }

        const body = await request.json();
        const { name, website, competitors } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
        }

        // Check max workspaces (limit to 50 for now)
        const { count } = await db
            .from('workspaces')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', profile.org_id);

        if ((count || 0) >= 50) {
            return NextResponse.json({ error: 'Maximum 50 brands per account' }, { status: 403 });
        }

        const { data: workspace, error } = await db
            .from('workspaces')
            .insert({
                org_id: profile.org_id,
                name: name.trim(),
                settings: {
                    website: website?.trim() || null,
                    competitors: competitors || [],
                },
            })
            .select('id, name, settings, created_at')
            .single();

        if (error) {
            console.error('Error creating workspace:', error);
            return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
        }

        // Run an automatic initial background scan to populate the dashboard!
        try {
            const { scanLLM } = await import('@/lib/ai/llm-scanner');
            
            const { results } = await scanLLM({
                prompt: `What is ${name.trim()}?`,
                brandName: name.trim(),
                brandDomain: website?.trim() || undefined,
                competitors: competitors || [],
                platforms: ['gemini', 'perplexity'], // Defaults back to mock if no keys found
            });

            if (results && results.length > 0) {
                const scanInserts = results.map(r => ({
                    workspace_id: workspace.id,
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
                }));
                if (scanInserts.length > 0) {
                    await db.from('llm_scans').insert(scanInserts);
                }
            }
        } catch (scanError) {
            console.error('Initial background scan failed:', scanError);
            // We do not fail the workspace creation if the scan fails
        }

        return NextResponse.json({ workspace });
    } catch (error) {
        console.error('Error creating workspace:', error);
        return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }
}
