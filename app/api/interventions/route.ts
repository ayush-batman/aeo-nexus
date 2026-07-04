import { NextRequest, NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';

// ── Types ───────────────────────────────────────────────────────────────────
// Kept intentionally minimal for v1. See migration 015 for the full schema.
interface CreateBody {
    action_type:
        | 'forum_reply' | 'content_publish' | 'content_update'
        | 'schema_add' | 'backlink_earned' | 'llms_txt_update' | 'other';
    title: string;
    description?: string;
    action_url?: string;
    forum_thread_id?: string;
    target_prompts?: string[];
    status?: 'planned' | 'in_progress' | 'completed';
    action_taken_at?: string; // ISO. If set (or status='completed'), we snapshot baseline now.
}

// GET /api/interventions — list workspace's interventions, newest first
export async function GET() {
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();
    const { data, error } = await db
        .from('interventions')
        .select('*')
        .eq('workspace_id', context.workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[interventions/list] db error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ interventions: data ?? [] });
}

// POST /api/interventions — create a new intervention.
// If action_taken_at is set (or status='completed'), snapshot baseline visibility
// for each target_prompt right now so we can compute a real delta later.
export async function POST(request: NextRequest) {
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: CreateBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.action_type || !body.title) {
        return NextResponse.json({ error: 'action_type and title are required' }, { status: 400 });
    }

    const db = createAdminClient();

    // If the caller says the action is completed (or gave an action_taken_at),
    // freeze a baseline snapshot from existing scans so "before" is stable.
    const shouldSnapshot = body.status === 'completed' || !!body.action_taken_at;
    let baselineSnapshot: Record<string, unknown> = {};
    if (shouldSnapshot && body.target_prompts && body.target_prompts.length > 0) {
        baselineSnapshot = await snapshotVisibility(db, context.workspaceId, body.target_prompts);
    }

    const insert = {
        workspace_id: context.workspaceId,
        action_type: body.action_type,
        title: body.title,
        description: body.description ?? null,
        action_url: body.action_url ?? null,
        forum_thread_id: body.forum_thread_id ?? null,
        target_prompts: body.target_prompts ?? [],
        status: body.status ?? 'planned',
        action_taken_at: body.action_taken_at ?? (shouldSnapshot ? new Date().toISOString() : null),
        baseline_snapshot: baselineSnapshot,
    };

    const { data, error } = await db
        .from('interventions')
        .insert(insert)
        .select()
        .single();

    if (error) {
        console.error('[interventions/create] db error:', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    return NextResponse.json({ intervention: data }, { status: 201 });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// For each target prompt, find the most recent scans per platform in this
// workspace and record their visibility signals. Older scans (>30d) ignored.
async function snapshotVisibility(
    db: ReturnType<typeof createAdminClient>,
    workspaceId: string,
    prompts: string[],
): Promise<Record<string, Record<string, { mentioned: boolean; position: number | null; sentiment: string | null }>>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: scans, error } = await db
        .from('llm_scans')
        .select('platform, prompt, brand_mentioned, mention_position, sentiment, created_at')
        .eq('workspace_id', workspaceId)
        .in('prompt', prompts)
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false });

    if (error || !scans) {
        console.warn('[interventions/snapshot] no scans found:', error);
        return {};
    }

    const out: Record<string, Record<string, { mentioned: boolean; position: number | null; sentiment: string | null }>> = {};
    for (const prompt of prompts) {
        out[prompt] = {};
    }
    // Take the most recent per (prompt, platform)
    for (const s of scans) {
        const bucket = out[s.prompt] ?? (out[s.prompt] = {});
        if (bucket[s.platform]) continue; // already have newer one (results are DESC)
        bucket[s.platform] = {
            mentioned: !!s.brand_mentioned,
            position: s.mention_position,
            sentiment: s.sentiment,
        };
    }
    return out;
}
