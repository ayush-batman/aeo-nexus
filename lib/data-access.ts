import { api } from '@/convex/_generated/api';
import type { FunctionReturnType } from 'convex/server';
import { fetchAuthMutation, fetchAuthQuery } from '@/lib/auth-server';
import { legacyScan, legacyThread } from './convex/records';
import { getConvexWorkspaceContext } from './convex/session';
import type { LLMScan, ForumThread } from './types';
import { estimateMentionConfidence } from './measurement/confidence';
import type { MeasurementConfidenceLevel } from './measurement/types';
import {
    aggregateMentionMetric,
    compareCompatibleMentionMetrics,
    healthScoreMetric,
    mentionMetricFromCounts,
    shareOfVoiceMetric,
    type ComparableMentionSample,
} from './measurement/metrics';

// Types for dashboard data
export interface DashboardStats {
    aeoHealthScore: number | null;
    aeoScoreChange: number | null;
    llmVisibility: number | null;
    llmVisibilityChange: number | null;
    llmVisibilitySamples: number;
    llmVisibilityMentions: number;
    llmVisibilityConfidence: MeasurementConfidenceLevel;
    forumThreadCount: number;
    highPriorityThreads: number;
    shareOfVoice: number | null;
    shareOfVoiceChange: number | null;
    contentScore: number | null;
    pagesNeedingOptimization: number;
}

export interface PlatformVisibility {
    platform: string;
    score: number | null;
    change: number | null;
    changeStatus: 'comparable' | 'incompatible' | 'insufficient_samples';
    scanCount: number;
    mentionCount: number;
    mentionRate: number | null;
    confidence: ReturnType<typeof estimateMentionConfidence>;
    averageMentionPosition: number | null;
    mentionPositionCount: number;
    mentionPositionTotal: number;
    comparisonCurrentSamples: number;
    comparisonCurrentMentions: number;
    comparisonPreviousSamples: number;
    comparisonPreviousMentions: number;
}

export interface RecentMention {
    id: string;
    platform: string;
    prompt: string;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    createdAt: string;
}

export { getConvexWorkspaceContext as getCurrentWorkspaceContext };

export async function getCurrentWorkspaceId(): Promise<string | null> {
    const context = await getConvexWorkspaceContext();
    return context?.workspaceId ?? null;
}


// Fetch recent LLM scans
export async function getLLMScans(workspaceId: string, limit = 10, opts?: { platform?: string }): Promise<LLMScan[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('invalid_scan_limit');
    const supported = ['chatgpt', 'gemini', 'claude', 'perplexity', 'google_ai', 'google_ai_overview', 'bing_copilot', 'mock'] as const;
    const platform = supported.find((value) => value === opts?.platform);
    if (opts?.platform && !platform) throw new Error('invalid_platform');
    return readScanPages(workspaceId, { platform }, limit);
}

export async function readScanPages(workspaceId: string, opts: { platform?: LLMScan['platform']; since?: number; before?: number } = {}, limit = Number.MAX_SAFE_INTEGER): Promise<LLMScan[]> {
    const rows: LLMScan[] = [];
    let cursor: string | null = null;
    do {
        const result: FunctionReturnType<typeof api.records.scans> = await fetchAuthQuery(api.records.scans, { workspaceId, ...opts,
            paginationOpts: { numItems: Math.min(100, limit - rows.length), cursor } });
        rows.push(...result.page.map((row) => legacyScan(row, workspaceId)));
        cursor = result.isDone ? null : result.continueCursor;
    } while (cursor && rows.length < limit);
    return rows;
}

// Calculate visibility metrics by platform
export async function getVisibilityMetrics(
    workspaceId: string,
    read: typeof readScanPages = readScanPages,
): Promise<PlatformVisibility[]> {
    const now = Date.now();
    const [recentScans, previousScans] = await Promise.all([
        read(workspaceId, { since: now - 7 * 86400000, before: now }),
        read(workspaceId, { since: now - 14 * 86400000, before: now - 7 * 86400000 }),
    ]);

    const platforms = ['chatgpt', 'gemini', 'perplexity', 'claude'];
    const metrics: PlatformVisibility[] = [];

    for (const platform of platforms) {
        const currentPlatformScans = recentScans.filter(s => s.platform === platform && !s.failure_code);
        const previousPlatformScans = previousScans.filter(s => s.platform === platform && !s.failure_code);

        const currentMetric = aggregateMentionMetric(currentPlatformScans.map((scan) => ({ mentioned: scan.brand_mentioned })));
        const comparable = (scan: typeof currentPlatformScans[number]): ComparableMentionSample => ({
            prompt: scan.prompt,
            platform: scan.platform,
            mentioned: scan.brand_mentioned,
            providerModel: scan.provider_model,
            region: scan.measurement_region,
            mode: scan.measurement_mode,
            scorerVersion: scan.scorer_version,
            contractVersion: scan.measurement_contract_version,
            searchMode: scan.search_mode,
            analyzerMethod: scan.analyzer_method,
            analyzerModel: scan.analyzer_model,
            analyzerPromptVersion: scan.analyzer_prompt_version,
        });
        const comparison = compareCompatibleMentionMetrics(
            currentPlatformScans.map(comparable),
            previousPlatformScans.map(comparable),
        );
        const mentionPositions = currentPlatformScans
            .filter((scan) => scan.brand_mentioned && scan.mention_position !== null)
            .map((scan) => scan.mention_position as number);
        const mentionPositionTotal = mentionPositions.reduce((sum, position) => sum + position, 0);

        metrics.push({
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            score: currentMetric.visibilityPercent,
            change: comparison.changePoints,
            changeStatus: comparison.status,
            scanCount: currentMetric.samples,
            mentionCount: currentMetric.mentions,
            mentionRate: currentMetric.mentionRate,
            confidence: currentMetric.confidence,
            averageMentionPosition: mentionPositions.length
                ? Math.round((mentionPositionTotal / mentionPositions.length) * 10) / 10
                : null,
            mentionPositionCount: mentionPositions.length,
            mentionPositionTotal,
            comparisonCurrentSamples: comparison.current.samples,
            comparisonCurrentMentions: comparison.current.mentions,
            comparisonPreviousSamples: comparison.previous.samples,
            comparisonPreviousMentions: comparison.previous.mentions,
        });
    }

    return metrics;
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
    const { status, platform, minScore = 0, limit = 20 } = options;
    if (!Number.isInteger(limit) || limit < 1) throw new Error('invalid_thread_limit');
    const rows: ForumThread[] = [];
    let cursor: string | null = null;
    do {
        const result: FunctionReturnType<typeof api.records.threads> = await fetchAuthQuery(api.records.threads, { workspaceId, status, platform, minScore,
            paginationOpts: { numItems: Math.min(100, limit - rows.length), cursor } });
        rows.push(...result.page.map((row) => legacyThread(row, workspaceId)));
        cursor = result.isDone ? null : result.continueCursor;
    } while (cursor && rows.length < limit);
    return rows;
}

// Calculate AEO Health Score
function healthScoreFromVisibilityMetrics(
    visibilityMetrics: PlatformVisibility[],
): { score: number | null; change: number | null } {
    const visibilitySamples = visibilityMetrics.reduce((sum, metric) => sum + metric.scanCount, 0);
    const visibilityMentions = visibilityMetrics.reduce((sum, metric) => sum + metric.mentionCount, 0);
    const visibility = mentionMetricFromCounts(visibilityMentions, visibilitySamples).visibilityPercent;
    const positionCount = visibilityMetrics.reduce((sum, metric) => sum + metric.mentionPositionCount, 0);
    const positionTotal = visibilityMetrics.reduce((sum, metric) => sum + metric.mentionPositionTotal, 0);
    const averagePosition = positionCount > 0 ? positionTotal / positionCount : null;

    return {
        score: healthScoreMetric(visibility, averagePosition),
        change: null,
    };
}

export async function getAEOHealthScore(
    workspaceId: string
): Promise<{ score: number | null; change: number | null }> {
    return healthScoreFromVisibilityMetrics(await getVisibilityMetrics(workspaceId));
}

// Get dashboard stats
export async function getDashboardStats(
    workspaceId: string,
    suppliedVisibilityMetrics?: PlatformVisibility[],
): Promise<DashboardStats> {
    const [visibilityMetrics, threads] = await Promise.all([
        suppliedVisibilityMetrics ?? getVisibilityMetrics(workspaceId),
        getForumThreads(workspaceId, { limit: Number.MAX_SAFE_INTEGER }),
    ]);
    const healthScore = healthScoreFromVisibilityMetrics(visibilityMetrics);

    const llmVisibilitySamples = visibilityMetrics.reduce((sum, metric) => sum + metric.scanCount, 0);
    const llmVisibilityMentions = visibilityMetrics.reduce((sum, metric) => sum + metric.mentionCount, 0);
    const llmMetric = mentionMetricFromCounts(llmVisibilityMentions, llmVisibilitySamples);
    const comparableCurrentSamples = visibilityMetrics.reduce((sum, metric) => sum + metric.comparisonCurrentSamples, 0);
    const comparableCurrentMentions = visibilityMetrics.reduce((sum, metric) => sum + metric.comparisonCurrentMentions, 0);
    const comparablePreviousSamples = visibilityMetrics.reduce((sum, metric) => sum + metric.comparisonPreviousSamples, 0);
    const comparablePreviousMentions = visibilityMetrics.reduce((sum, metric) => sum + metric.comparisonPreviousMentions, 0);
    const comparableCurrent = mentionMetricFromCounts(comparableCurrentMentions, comparableCurrentSamples);
    const comparablePrevious = mentionMetricFromCounts(comparablePreviousMentions, comparablePreviousSamples);
    const llmVisibilityChange = comparableCurrent.visibilityPercent !== null && comparablePrevious.visibilityPercent !== null
        ? comparableCurrent.visibilityPercent - comparablePrevious.visibilityPercent
        : null;

    // Count high priority threads (score >= 70)
    const highPriorityThreads = threads.filter(t => t.opportunity_score >= 70).length;

    // ── Share of Voice: brand mentions vs competitor mentions ──
    let shareOfVoice: number | null = null;
    const shareOfVoiceChange: number | null = null;

    const recentScans = (await readScanPages(workspaceId, { since: Date.now() - 7 * 86400000 }))
        .filter((row) => !row.failure_code);

    if (recentScans && recentScans.length > 0) {
        shareOfVoice = shareOfVoiceMetric(recentScans.map((scan) => ({
            brandMentioned: scan.brand_mentioned,
            competitorsMentioned: scan.competitors_mentioned,
        }))).sharePercent;
    }

    // ── Content Score: average from content_analyses ──
    let contentScore: number | null = null;
    let pagesNeedingOptimization = 0;

    const contentAnalyses: { aeo_score: number }[] = [];
    let contentCursor: string | null = null;
    do {
        const result: FunctionReturnType<typeof api.records.content> = await fetchAuthQuery(api.records.content, { workspaceId,
            paginationOpts: { numItems: 100, cursor: contentCursor } });
        contentAnalyses.push(...result.page.map((row) => ({ aeo_score: row.aeloScore })));
        contentCursor = result.isDone ? null : result.continueCursor;
    } while (contentCursor);

    if (contentAnalyses && contentAnalyses.length > 0) {
        contentScore = Math.round(
            contentAnalyses.reduce((sum, a) => sum + (a.aeo_score || 0), 0) / contentAnalyses.length
        );
        pagesNeedingOptimization = contentAnalyses.filter(a => (a.aeo_score || 0) < 60).length;
    }

    return {
        aeoHealthScore: healthScore.score,
        aeoScoreChange: healthScore.change,
        llmVisibility: llmMetric.visibilityPercent,
        llmVisibilityChange,
        llmVisibilitySamples,
        llmVisibilityMentions,
        llmVisibilityConfidence: llmMetric.confidence.level,
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
    const rows: ScheduledScan[] = [];
    let cursor: string | null = null;
    do {
        const page: FunctionReturnType<typeof api.schedules.list> = await fetchAuthQuery(api.schedules.list, { workspaceId, paginationOpts: { numItems: 100, cursor } });
        rows.push(...page.page);
        cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    return rows;
}

function schedulePlatforms(platforms: string[]) {
    const allowed = ['chatgpt', 'gemini', 'claude', 'perplexity'] as const;
    return platforms.map((value) => {
        const platform = allowed.find((candidate) => candidate === value);
        if (!platform) throw new Error('invalid_platform');
        return platform;
    });
}

export async function createScheduledScan(scan: {
    workspace_id: string; prompt: string; platforms: string[]; competitors?: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
}): Promise<ScheduledScan | null> {
    return fetchAuthMutation(api.schedules.save, { workspaceId: scan.workspace_id, prompt: scan.prompt,
        platforms: schedulePlatforms(scan.platforms), competitors: scan.competitors, frequency: scan.frequency });
}

export async function updateScheduledScan(id: string, updates: Partial<ScheduledScan>): Promise<ScheduledScan | null> {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error('Unauthenticated');
    return fetchAuthMutation(api.schedules.save, { workspaceId, id, prompt: updates.prompt,
        platforms: updates.platforms ? schedulePlatforms(updates.platforms) : undefined,
        competitors: updates.competitors ?? undefined, frequency: updates.frequency, status: updates.status });
}

export async function deleteScheduledScan(id: string): Promise<boolean> {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error('Unauthenticated');
    await fetchAuthMutation(api.schedules.remove, { workspaceId, id });
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
    const prompts: Prompt[] = [];
    let cursor: string | null = null;
    do {
        const result: FunctionReturnType<typeof api.prompts.list> = await fetchAuthQuery(api.prompts.list, {
            workspaceId, paginationOpts: { numItems: 100, cursor },
        });
        prompts.push(...result.page);
        cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);
    return prompts;
}

export async function savePrompt(promptData: {
    workspace_id: string;
    prompt: string;
    category?: string;
    is_favorite?: boolean;
    ai_generated?: boolean;
}): Promise<Prompt | null> {
    return fetchAuthMutation(api.prompts.save, {
        workspaceId: promptData.workspace_id,
        prompt: promptData.prompt,
        category: promptData.category,
        isFavorite: promptData.is_favorite,
        aiGenerated: promptData.ai_generated,
    });
}

export async function deletePrompt(id: string): Promise<boolean> {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) throw new Error('Unauthenticated');
    await fetchAuthMutation(api.prompts.remove, { workspaceId, id });
    return true;
}
