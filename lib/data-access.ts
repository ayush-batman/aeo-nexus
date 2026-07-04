import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import type { LLMScan, ForumThread, VisibilityMetric } from './types';

// ── Dev Auth Bypass ─────────────────────────────────────────────────────────
// Guarded by NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS=true AND a `dev-auth-bypass=true`
// cookie. Both required — so it can NEVER activate in prod without the env flag
// AND a cookie a browser has to actively set.
//
// Bootstraps a real Supabase auth user (dev@aelo.local) via the admin API so all
// downstream FKs (public.users → auth.users) hold and the normal profile/org/
// workspace autoprovision code runs unchanged.
const DEV_BYPASS_EMAIL = 'dev@aelo.local';
let cachedDevUser: { id: string; email: string } | null = null;

async function getOrCreateDevUser(): Promise<{ id: string; email: string } | null> {
    if (cachedDevUser) return cachedDevUser;
    try {
        const admin = createAdminClient();
        // Look up first (auth.admin.listUsers is paged; email filter is exact)
        const { data: list, error: listErr } = await admin.auth.admin.listUsers();
        if (listErr) {
            console.warn('[dev-bypass] listUsers failed:', listErr);
        }
        const existing = list?.users?.find(u => u.email === DEV_BYPASS_EMAIL);
        if (existing?.email) {
            cachedDevUser = { id: existing.id, email: existing.email };
            return cachedDevUser;
        }
        // Create — random password, never used (we don't sign in via password)
        const { data, error } = await admin.auth.admin.createUser({
            email: DEV_BYPASS_EMAIL,
            password: randomUUID(),
            email_confirm: true,
            user_metadata: { full_name: 'Aelo Dev', dev_bypass: true },
        });
        if (error || !data.user?.email) {
            console.error('[dev-bypass] createUser failed:', error);
            return null;
        }
        cachedDevUser = { id: data.user.id, email: data.user.email };
        return cachedDevUser;
    } catch (e) {
        console.warn('[dev-bypass] getOrCreateDevUser failed:', e);
        return null;
    }
}

// Types for dashboard data
export interface DashboardStats {
    aeoHealthScore: number;
    aeoScoreChange: number;
    llmVisibility: number;
    llmVisibilityChange: number;
    forumThreadCount: number;
    highPriorityThreads: number;
    shareOfVoice: number;
    shareOfVoiceChange: number;
    contentScore: number;
    pagesNeedingOptimization: number;
}

export interface PlatformVisibility {
    platform: string;
    score: number;
    change: number;
    scanCount: number;
}

export interface RecentMention {
    id: string;
    platform: string;
    prompt: string;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    createdAt: string;
}

// Get the current user's workspace ID (auto-creates profile if missing)
export async function getCurrentWorkspaceContext(): Promise<{
    userId: string;
    orgId: string;
    workspaceId: string;
    onboardingCompleted: boolean;
} | null> {
    const supabase = await createClient();

    // Dev Auth Bypass (localhost / QA only — see helper at top of file)
    let user: { id: string; email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } } | null = null;
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === 'true') {
        try {
            const cookieStore = await cookies();
            if (cookieStore.get('dev-auth-bypass')?.value === 'true') {
                const dev = await getOrCreateDevUser();
                if (dev) {
                    user = { id: dev.id, email: dev.email, user_metadata: { full_name: 'Aelo Dev' } };
                }
            }
        } catch {
            // cookies() unavailable in this context — fall through to normal auth
        }
    }

    if (!user) {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    }

    if (!user) {
        console.log('[getCurrentWorkspaceContext] No authenticated user');
        return null;
    }

    let adminClient: ReturnType<typeof createAdminClient> | null = null;
    try {
        adminClient = createAdminClient();
    } catch (error) {
        console.warn('[getCurrentWorkspaceContext] Admin client unavailable, falling back to RLS client:', error);
    }

    const db = adminClient ?? supabase;
    const useManualIds = !adminClient;

    // Get user's profile (create if missing)
    const { data: profile } = await db
        .from('users')
        .select('org_id, onboarding_completed, role')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile?.org_id) {
        console.log('[getCurrentWorkspaceContext] Creating profile for:', user.id);

        const orgName = (user.user_metadata?.full_name || user.email?.split('@')[0] || 'User') + "'s Organization";
        const orgId = useManualIds ? randomUUID() : undefined;

        const orgInsert = useManualIds
            ? { id: orgId, name: orgName }
            : { name: orgName };

        let createdOrgId = orgId;
        if (useManualIds) {
            const { error: orgError } = await db
                .from('organizations')
                .insert(orgInsert);
            if (orgError || !createdOrgId) {
                console.error('[getCurrentWorkspaceContext] Failed to create org:', orgError);
                return null;
            }
        } else {
            const { data: newOrg, error: orgError } = await db
                .from('organizations')
                .insert(orgInsert)
                .select('id')
                .single();
            createdOrgId = newOrg?.id;
            if (orgError || !createdOrgId) {
                console.error('[getCurrentWorkspaceContext] Failed to create org:', orgError);
                return null;
            }
        }

        const { error: userError } = await db
            .from('users')
            .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || null,
                avatar_url: user.user_metadata?.avatar_url || null,
                org_id: createdOrgId,
                role: 'owner',
                onboarding_completed: false,
            });

        if (userError) {
            console.error('[getCurrentWorkspaceContext] Failed to create user:', userError);
            return null;
        }

        const workspaceId = useManualIds ? randomUUID() : undefined;
        const wsInsert = useManualIds
            ? { id: workspaceId, org_id: createdOrgId, name: 'My Brand' }
            : { org_id: createdOrgId, name: 'My Brand' };

        let createdWorkspaceId = workspaceId;
        if (useManualIds) {
            const { error: wsError } = await db
                .from('workspaces')
                .insert(wsInsert);
            if (wsError || !createdWorkspaceId) {
                console.error('[getCurrentWorkspaceContext] Failed to create workspace:', wsError);
                return null;
            }
        } else {
            const { data: newWorkspace, error: wsError } = await db
                .from('workspaces')
                .insert(wsInsert)
                .select('id')
                .single();
            createdWorkspaceId = newWorkspace?.id;
            if (wsError || !createdWorkspaceId) {
                console.error('[getCurrentWorkspaceContext] Failed to create workspace:', wsError);
                return null;
            }
        }

        return {
            userId: user.id,
            orgId: createdOrgId,
            workspaceId: createdWorkspaceId,
            onboardingCompleted: false,
        };
    }

    // Ensure workspace exists — check for active workspace cookie first
    let workspaceSelectQuery;
    let activeWsId: string | undefined;
    
    try {
        const cookieStore = await cookies();
        activeWsId = cookieStore.get('active-workspace-id')?.value;
    } catch {
        // cookies() may fail in some contexts
    }

    if (activeWsId) {
        // Verify this workspace belongs to the user's org
        const { data: workspace } = await db
            .from('workspaces')
            .select('id')
            .eq('id', activeWsId)
            .eq('org_id', profile.org_id)
            .single();

        if (workspace?.id) {
            return {
                userId: user.id,
                orgId: profile.org_id,
                workspaceId: workspace.id,
                onboardingCompleted: profile.onboarding_completed ?? false,
            };
        }
    }

    // Fallback: pick first workspace
    const { data: workspace } = await db
        .from('workspaces')
        .select('id')
        .eq('org_id', profile.org_id)
        .limit(1)
        .single();

    if (!workspace?.id) {
        const workspaceId = useManualIds ? randomUUID() : undefined;
        const wsInsert = useManualIds
            ? { id: workspaceId, org_id: profile.org_id, name: 'My Brand' }
            : { org_id: profile.org_id, name: 'My Brand' };

        let createdWorkspaceId = workspaceId;
        if (useManualIds) {
            const { error: createError } = await db
                .from('workspaces')
                .insert(wsInsert);
            if (createError || !createdWorkspaceId) {
                console.error('[getCurrentWorkspaceContext] Failed to create workspace:', createError);
                return null;
            }
        } else {
            const { data: newWs, error: createError } = await db
                .from('workspaces')
                .insert(wsInsert)
                .select('id')
                .single();
            createdWorkspaceId = newWs?.id;
            if (createError || !createdWorkspaceId) {
                console.error('[getCurrentWorkspaceContext] Failed to create workspace:', createError);
                return null;
            }
        }

        return {
            userId: user.id,
            orgId: profile.org_id,
            workspaceId: createdWorkspaceId!,
            onboardingCompleted: profile.onboarding_completed ?? false,
        };
    }

    return {
        userId: user.id,
        orgId: profile.org_id,
        workspaceId: workspace.id,
        onboardingCompleted: profile.onboarding_completed ?? false,
    };
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
    const context = await getCurrentWorkspaceContext();
    return context?.workspaceId ?? null;
}


// Fetch recent LLM scans
export async function getLLMScans(
    workspaceId: string,
    limit: number = 10
): Promise<LLMScan[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('llm_scans')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching LLM scans:', error);
        return [];
    }

    return (data || []).map(scan => ({
        id: scan.id,
        workspace_id: scan.workspace_id,
        platform: scan.platform,
        prompt: scan.prompt,
        response: scan.response,
        brand_mentioned: scan.brand_mentioned,
        mention_position: scan.mention_position,
        sentiment: scan.sentiment,
        competitors_mentioned: scan.competitors_mentioned || [],
        citations: scan.citations || [],
        created_at: scan.created_at,
    }));
}

// Calculate visibility metrics by platform
export async function getVisibilityMetrics(
    workspaceId: string
): Promise<PlatformVisibility[]> {
    const supabase = await createAdminClient();

    // Get scans from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentScans } = await supabase
        .from('llm_scans')
        .select('platform, brand_mentioned, mention_position, sentiment')
        .eq('workspace_id', workspaceId)
        .gte('created_at', sevenDaysAgo.toISOString());

    // Get scans from previous 7 days for comparison
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: previousScans } = await supabase
        .from('llm_scans')
        .select('platform, brand_mentioned, mention_position, sentiment')
        .eq('workspace_id', workspaceId)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString());

    const platforms = ['chatgpt', 'gemini', 'perplexity', 'claude'];
    const metrics: PlatformVisibility[] = [];

    for (const platform of platforms) {
        const currentPlatformScans = (recentScans || []).filter(s => s.platform === platform);
        const previousPlatformScans = (previousScans || []).filter(s => s.platform === platform);

        const currentScore = calculatePlatformScore(currentPlatformScans);
        const previousScore = calculatePlatformScore(previousPlatformScans);

        metrics.push({
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            score: currentScore,
            change: currentScore - previousScore,
            scanCount: currentPlatformScans.length,
        });
    }

    return metrics;
}

// Helper to calculate platform visibility score
function calculatePlatformScore(scans: Array<{ brand_mentioned: boolean; mention_position: number | null; sentiment: string | null }>): number {
    if (scans.length === 0) return 0;

    let totalScore = 0;

    for (const scan of scans) {
        if (scan.brand_mentioned) {
            // Base score for being mentioned
            let score = 40;

            // Position bonus
            if (scan.mention_position === 1) score += 30;
            else if (scan.mention_position === 2) score += 20;
            else if (scan.mention_position && scan.mention_position <= 5) score += 10;

            // Sentiment bonus
            if (scan.sentiment === 'positive') score += 20;
            else if (scan.sentiment === 'neutral') score += 10;

            totalScore += score;
        }
    }

    return Math.min(100, Math.round(totalScore / scans.length));
}

// Fetch forum threads
export async function getForumThreads(
    workspaceId: string,
    options: {
        status?: string;
        platform?: string;
        minScore?: number;
        limit?: number;
    } = {}
): Promise<ForumThread[]> {
    const supabase = createAdminClient();
    const { status, platform, minScore = 0, limit = 20 } = options;

    let query = supabase
        .from('forum_threads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('opportunity_score', minScore)
        .order('opportunity_score', { ascending: false })
        .limit(limit);

    if (status) {
        query = query.eq('status', status);
    }
    if (platform) {
        query = query.eq('platform', platform);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching forum threads:', error);
        return [];
    }

    return data || [];
}

// Calculate AEO Health Score
export async function getAEOHealthScore(
    workspaceId: string
): Promise<{ score: number; change: number }> {
    const supabase = await createAdminClient();

    // Get all visibility metrics
    const visibilityMetrics = await getVisibilityMetrics(workspaceId);

    // Get forum engagement metrics
    const { data: threads } = await supabase
        .from('forum_threads')
        .select('status, opportunity_score')
        .eq('workspace_id', workspaceId);

    // Calculate composite score
    let score = 0;
    let change = 0;

    // LLM Visibility component (50% weight)
    if (visibilityMetrics.length > 0) {
        const avgVisibility = visibilityMetrics.reduce((sum, m) => sum + m.score, 0) / visibilityMetrics.length;
        const avgChange = visibilityMetrics.reduce((sum, m) => sum + m.change, 0) / visibilityMetrics.length;
        score += avgVisibility * 0.5;
        change += avgChange * 0.5;
    }

    // Forum engagement component (30% weight)
    if (threads && threads.length > 0) {
        const postedThreads = threads.filter(t => t.status === 'posted').length;
        const engagementRate = (postedThreads / threads.length) * 100;
        score += Math.min(100, engagementRate) * 0.3;
    }

    // Content score component (20% weight)
    const { data: contentAnalyses } = await supabase
        .from('content_analyses')
        .select('aeo_score')
        .eq('workspace_id', workspaceId);

    if (contentAnalyses && contentAnalyses.length > 0) {
        const avgContentScore = contentAnalyses.reduce((sum, a) => sum + (a.aeo_score || 0), 0) / contentAnalyses.length;
        score += avgContentScore * 0.2;
    }

    return {
        score: Math.round(score),
        change: Math.round(change),
    };
}

// Get dashboard stats
export async function getDashboardStats(
    workspaceId: string
): Promise<DashboardStats> {
    const supabase = await createAdminClient();

    const [healthScore, visibilityMetrics, threads] = await Promise.all([
        getAEOHealthScore(workspaceId),
        getVisibilityMetrics(workspaceId),
        getForumThreads(workspaceId, { limit: 100 }),
    ]);

    // Calculate average LLM visibility
    const avgVisibility = visibilityMetrics.length > 0
        ? Math.round(visibilityMetrics.reduce((sum, m) => sum + m.score, 0) / visibilityMetrics.length)
        : 0;

    const avgVisibilityChange = visibilityMetrics.length > 0
        ? Math.round(visibilityMetrics.reduce((sum, m) => sum + m.change, 0) / visibilityMetrics.length)
        : 0;

    // Count high priority threads (score >= 70)
    const highPriorityThreads = threads.filter(t => t.opportunity_score >= 70).length;

    // ── Share of Voice: brand mentions vs competitor mentions ──
    let shareOfVoice = 0;
    let shareOfVoiceChange = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentScans } = await supabase
        .from('llm_scans')
        .select('brand_mentioned, competitors_mentioned')
        .eq('workspace_id', workspaceId)
        .gte('created_at', sevenDaysAgo.toISOString());

    if (recentScans && recentScans.length > 0) {
        const myMentions = recentScans.filter(s => s.brand_mentioned).length;
        const totalCompMentions = recentScans.reduce((sum, s) => {
            const comps = s.competitors_mentioned || [];
            return sum + comps.length;
        }, 0);
        const totalMentions = myMentions + totalCompMentions;
        shareOfVoice = totalMentions > 0 ? Math.round((myMentions / totalMentions) * 100) : 0;
    }

    // ── Content Score: average from content_analyses ──
    let contentScore = 0;
    let pagesNeedingOptimization = 0;

    const { data: contentAnalyses } = await supabase
        .from('content_analyses')
        .select('aeo_score')
        .eq('workspace_id', workspaceId);

    if (contentAnalyses && contentAnalyses.length > 0) {
        contentScore = Math.round(
            contentAnalyses.reduce((sum, a) => sum + (a.aeo_score || 0), 0) / contentAnalyses.length
        );
        pagesNeedingOptimization = contentAnalyses.filter(a => (a.aeo_score || 0) < 60).length;
    }

    return {
        aeoHealthScore: healthScore.score,
        aeoScoreChange: healthScore.change,
        llmVisibility: avgVisibility,
        llmVisibilityChange: avgVisibilityChange,
        forumThreadCount: threads.length,
        highPriorityThreads,
        shareOfVoice,
        shareOfVoiceChange,
        contentScore,
        pagesNeedingOptimization,
    };
}

// Get recent mentions for dashboard
export async function getRecentMentions(
    workspaceId: string,
    limit: number = 5
): Promise<RecentMention[]> {
    const scans = await getLLMScans(workspaceId, limit);

    return scans
        .filter(scan => scan.brand_mentioned)
        .map(scan => ({
            id: scan.id,
            platform: scan.platform.charAt(0).toUpperCase() + scan.platform.slice(1),
            prompt: scan.prompt,
            sentiment: scan.sentiment,
            createdAt: scan.created_at,
        }));
}

// Scheduled Scans
export interface ScheduledScan {
    id: string;
    workspace_id: string;
    created_at: string;
    updated_at: string;
    prompt: string;
    platforms: string[];
    competitors: string[] | null;
    frequency: 'daily' | 'weekly' | 'monthly';
    last_run_at: string | null;
    next_run_at: string;
    status: 'active' | 'paused';
}

export async function getScheduledScans(workspaceId: string): Promise<ScheduledScan[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('scheduled_scans')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching scheduled scans:', error);
        return [];
    }
    return data || [];
}

export async function createScheduledScan(scan: {
    workspace_id: string;
    prompt: string;
    platforms: string[];
    competitors?: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
}): Promise<ScheduledScan | null> {
    const supabase = await createClient();

    // Calculate next run immediately
    const nextRun = new Date();
    // For demo purposes, set it to run in 1 minute so user can see it work? 
    // No, strictly follow frequency. But daily means "tomorrow same time".
    // Let's default to "tomorrow" for daily, or just "now" if we want to run immediately?
    // Usually schedules start immediately or at next interval. Let's say next interval.
    // Actually, user probably wants first run immediately. 
    // I'll set next_run_at to NOW() so the cron picks it up quickly.

    const { data, error } = await supabase
        .from('scheduled_scans')
        .insert({
            workspace_id: scan.workspace_id,
            prompt: scan.prompt,
            platforms: scan.platforms,
            competitors: scan.competitors || [],
            frequency: scan.frequency,
            next_run_at: new Date().toISOString(), // Run immediately on next cron tick
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating scheduled scan:', error);
        return null;
    }
    return data;
}

export async function updateScheduledScan(id: string, updates: Partial<ScheduledScan>): Promise<ScheduledScan | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('scheduled_scans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating scheduled scan:', error);
        return null;
    }
    return data;
}

export async function deleteScheduledScan(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('scheduled_scans')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting scheduled scan:', error);
        return false;
    }
    return true;
}

// Prompt Library

export interface Prompt {
    id: string;
    workspace_id: string;
    prompt: string;
    category: string | null;
    is_favorite: boolean;
    ai_generated: boolean;
    created_at: string;
}

export async function getPrompts(workspaceId: string): Promise<Prompt[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('prompt_library')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching prompts:', error);
        return [];
    }
    return data || [];
}

export async function savePrompt(promptData: {
    workspace_id: string;
    prompt: string;
    category?: string;
    is_favorite?: boolean;
    ai_generated?: boolean;
}): Promise<Prompt | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('prompt_library')
        .insert({
            workspace_id: promptData.workspace_id,
            prompt: promptData.prompt,
            category: promptData.category || 'General',
            is_favorite: promptData.is_favorite ?? false,
            ai_generated: promptData.ai_generated ?? false,
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving prompt:', error);
        return null;
    }
    return data;
}

export async function deletePrompt(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('prompt_library')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting prompt:', error);
        return false;
    }
    return true;
}
