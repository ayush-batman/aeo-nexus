import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scanLLM } from '@/lib/ai/llm-scanner';
import type { LLMPlatform } from '@/lib/ai/llm-scanner';
import { PLAN_LIMITS } from '@/lib/config';

// Initialize Supabase Admin Client
// We need admin access to fetch all schedules across workspaces and bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function GET(request: NextRequest) {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Fallback check for Vercel Cron
        // Vercel Cron requests do not send a Bearer token by default in the same way, 
        // they verify via signature, but user can set header.
        // For simplicity, we enforce CRON_SECRET which user must configure in Vercel Cron job.
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch due schedules
        const now = new Date().toISOString();
        const { data: schedules, error } = await supabaseAdmin
            .from('scheduled_scans')
            .select(`
                *,
                workspaces (
                    name,
                    id,
                    org_id
                )
            `)
            .eq('status', 'active')
            .lte('next_run_at', now);

        if (error) {
            console.error('Error fetching schedules:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!schedules || schedules.length === 0) {
            return NextResponse.json({ message: 'No schedules due' });
        }

        console.log(`Found ${schedules.length} schedules to run`);

        const results = [];

        // 2. Process each schedule
        for (const schedule of schedules) {
            const workspace = schedule.workspaces;
            if (!workspace) continue;

            // Check usage limits
            // @ts-ignore
            const orgId = workspace.org_id;

            // Get plan
            const { data: org } = await supabaseAdmin
                .from('organizations')
                .select('plan')
                .eq('id', orgId)
                .single();

            const plan = org?.plan || 'free';
            // @ts-ignore
            const limit = PLAN_LIMITS[plan]?.scans ?? PLAN_LIMITS.free.scans;

            if (limit !== -1) {
                // Count usage
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

                // Get all workspace IDs for this org
                const { data: orgWorkspaces } = await supabaseAdmin
                    .from('workspaces')
                    .select('id')
                    .eq('org_id', orgId);

                const wsIds = orgWorkspaces?.map(w => w.id) || [];

                const { count: currentUsage } = await supabaseAdmin
                    .from('llm_scans')
                    .select('*', { count: 'exact', head: true })
                    .in('workspace_id', wsIds)
                    .gte('created_at', startOfMonth);

                if ((currentUsage || 0) >= limit) {
                    console.warn(`Skipping schedule ${schedule.id}: Org ${orgId} reached scan limit (${currentUsage}/${limit})`);

                    // Update status to show skipped
                    await supabaseAdmin
                        .from('scheduled_scans')
                        .update({
                            last_run_status: 'skipped_limit_reached',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', schedule.id);

                    results.push({
                        id: schedule.id,
                        status: 'skipped',
                        reason: 'limit_reached'
                    });
                    continue;
                }
            }

            const brandName = workspace.name || 'My Brand';

            // Try to get brand domain from settings if available (assuming it's in a jsonb column or separate table)
            // For now, we skip brandDomain or hardcode if needed. 
            // Better: fetch it from settings table if it existed.
            // We'll proceed without brandDomain for now.

            console.log(`Processing schedule ${schedule.id} for workspace ${workspace.name}`);

            try {
                // Run Scan
                const { results: scanResults, errors: scanErrors } = await scanLLM({
                    prompt: schedule.prompt,
                    brandName: brandName,
                    competitors: schedule.competitors || [],
                    platforms: schedule.platforms as LLMPlatform[],
                    mode: 'standard',
                });

                if (scanErrors.length > 0) {
                    console.warn(`Schedule ${schedule.id}: ${scanErrors.length} platform(s) failed:`, scanErrors.map(e => `${e.platform}: ${e.error}`).join(', '));
                }

                if (scanResults.length > 0) {
                    const scansToInsert = scanResults.map(res => ({
                        workspace_id: schedule.workspace_id,
                        platform: res.platform,
                        prompt: res.prompt,
                        response: res.response,
                        brand_mentioned: res.brandMentioned,
                        mention_position: res.mentionPosition,
                        sentiment: res.sentiment,
                        competitors_mentioned: res.competitorsMentioned,
                        citations: res.citations,
                        created_at: new Date().toISOString(),
                    }));

                    const { error: insertError } = await supabaseAdmin
                        .from('llm_scans')
                        .insert(scansToInsert);

                    if (insertError) {
                        console.error(`Error saving scan results for schedule ${schedule.id}:`, insertError);
                    }
                }

                // Calculate next run time
                const lastRun = new Date();
                let nextRun = new Date(schedule.next_run_at); // Start from previous scheduled time to avoid drift? 
                // Or simply from NOW? Usually from NOW is safer to avoid catch-up loops if cron was down.
                // But from scheduled time preserves cadence. 
                // Let's use NOW for simplicity and robustness.
                nextRun = new Date();

                switch (schedule.frequency) {
                    case 'daily':
                        nextRun.setDate(nextRun.getDate() + 1);
                        break;
                    case 'weekly':
                        nextRun.setDate(nextRun.getDate() + 7);
                        break;
                    case 'monthly':
                        nextRun.setMonth(nextRun.getMonth() + 1);
                        break;
                    default:
                        nextRun.setDate(nextRun.getDate() + 1); // Default to daily
                }

                // Update schedule
                await supabaseAdmin
                    .from('scheduled_scans')
                    .update({
                        last_run_at: lastRun.toISOString(),
                        next_run_at: nextRun.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', schedule.id);

                results.push({
                    id: schedule.id,
                    status: scanResults.length > 0 ? 'success' : 'no_results',
                    scans_count: scanResults.length,
                    errors_count: scanErrors.length,
                });

            } catch (err) {
                console.error(`Error processing schedule ${schedule.id}:`, err);
                results.push({
                    id: schedule.id,
                    status: 'failed',
                    error: String(err)
                });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            details: results
        });

    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
