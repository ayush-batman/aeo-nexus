import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { requireWorkspaceRole } from '@/lib/authorization';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getEntitlements } from '@/lib/entitlements';
import { createAdminClient } from '@/lib/supabase/admin';

const FREQUENCIES = new Set(['daily', 'weekly', 'monthly']);

export async function GET() {
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('scheduled_scans')
        .select('*')
        .eq('workspace_id', context.workspaceId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[scheduled-scans/list] failed:', error);
        return NextResponse.json({ error: 'Failed to load scheduled scans.' }, { status: 500 });
    }
    return NextResponse.json({ schedules: data ?? [] });
}

export async function POST(request: NextRequest) {
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!requireWorkspaceRole(context, ['owner', 'admin', 'editor'])) {
        return NextResponse.json({ error: 'Editor access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 2_000) {
        return NextResponse.json({ error: 'Prompt is required and must be 2,000 characters or fewer.' }, { status: 400 });
    }
    const frequency = typeof body?.frequency === 'string' ? body.frequency : 'weekly';
    if (!FREQUENCIES.has(frequency)) {
        return NextResponse.json({ error: 'Frequency must be daily, weekly, or monthly.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const entitlements = await getEntitlements(context.orgId, admin);
    const available = getAvailablePlatforms()
        .filter(engine => engine.available && engine.platform !== 'mock')
        .map(engine => engine.platform);
    const allowed = available.filter(engine => entitlements.engines.includes(engine));
    const requested = Array.isArray(body?.platforms)
        ? [...new Set(body.platforms.filter((value): value is string => typeof value === 'string'))]
        : [];
    const platforms = requested.filter((engine): engine is LLMPlatform => allowed.includes(engine as LLMPlatform));
    if (requested.length === 0) {
        return NextResponse.json({ error: 'Choose at least one AI engine.' }, { status: 400 });
    }
    if (platforms.length !== requested.length) {
        return NextResponse.json({ error: 'engine_not_entitled', message: 'One or more engines are unavailable or not included in this plan.' }, { status: 403 });
    }

    const competitors = Array.isArray(body?.competitors)
        ? body.competitors
            .filter((value): value is string => typeof value === 'string')
            .map(value => value.trim().slice(0, 100))
            .filter(Boolean)
            .slice(0, 20)
        : [];
    const { data, error } = await admin
        .from('scheduled_scans')
        .insert({
            workspace_id: context.workspaceId,
            prompt,
            platforms,
            competitors,
            frequency,
            status: 'active',
            next_run_at: new Date().toISOString(),
        })
        .select()
        .single();
    if (error) {
        console.error('[scheduled-scans/create] failed:', error);
        return NextResponse.json({ error: 'Failed to create scheduled scan.' }, { status: 500 });
    }
    return NextResponse.json({ schedule: data }, { status: 201 });
}
