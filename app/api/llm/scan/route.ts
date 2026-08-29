import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAvailablePlatforms, scanLLM, type BattleResult, type LLMPlatform, type ScanResult } from '@/lib/ai/llm-scanner';
import { requireWorkspaceRole } from '@/lib/authorization';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { runVisibilityMeasurement } from '@/lib/measurement/service';
import { scanResultPersistenceRow } from '@/lib/measurement/persistence';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
    try {
        const context = await getCurrentWorkspaceContext();
        if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!requireWorkspaceRole(context, ['owner', 'admin', 'editor'])) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json().catch(() => null) as Record<string, unknown> | null;
        const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
        const brandName = typeof body?.brandName === 'string' ? body.brandName.trim() : '';
        const brandDomain = typeof body?.brandDomain === 'string' ? body.brandDomain : undefined;
        const competitors = Array.isArray(body?.competitors)
            ? body.competitors.filter((value): value is string => typeof value === 'string').slice(0, 20)
            : [];
        const requestedPlatforms = Array.isArray(body?.platforms)
            ? body.platforms.filter((value): value is LLMPlatform => typeof value === 'string')
            : null;

        if (!prompt || !brandName) {
            return NextResponse.json({ error: 'prompt and brandName are required' }, { status: 400 });
        }

        const availableInfo = getAvailablePlatforms();
        const availablePlatformIds = availableInfo.filter(platform => platform.available).map(platform => platform.platform);
        const admin = createAdminClient();
        const entitlements = await getEntitlements(context.orgId, admin);
        const platforms = (requestedPlatforms ?? availablePlatformIds)
            .filter(platform => availablePlatformIds.includes(platform) && entitlements.engines.includes(platform)) as LLMPlatform[];

        if (platforms.length === 0) {
            return NextResponse.json({
                error: 'no_engines_available',
                message: 'No entitled AI engines are currently configured.',
                available: availableInfo,
                allowedEngines: entitlements.engines,
            }, { status: 503 });
        }

        const reservation = await reserveScanQuota(context.orgId, `app:${randomUUID()}`, admin);
        if (reservation === 'denied') {
            return NextResponse.json({
                error: 'limit_reached',
                message: entitlements.scansPerWeek === null
                    ? 'Scan quota is unavailable.'
                    : `This plan is limited to ${entitlements.scansPerWeek} scans per week.`,
                upgrade: entitlements.scansPerWeek !== null,
                limit: entitlements.scansPerWeek,
            }, { status: 429 });
        }

        const rawResults: ScanResult[] = [];
        const measurement = await runVisibilityMeasurement({
            prompt,
            brandName,
            brandDomain,
            competitors,
            platforms,
            samples: 4,
            mode: body?.mode === 'battle' ? 'battle' : 'standard',
        }, {
            execute: async (options) => {
                const output = await scanLLM(options);
                rawResults.push(...output.results);
                return output;
            },
            persist: async (results) => {
                const { error } = await admin.from('llm_scans').insert(results.map(result => scanResultPersistenceRow(context.workspaceId, result)));
                if (error) throw new Error('Failed to store measurement samples.');
            },
        });

        if (measurement.status === 'all_failed') {
            return NextResponse.json({
                error: 'All AI engines failed. Check provider configuration.',
                measurement,
                platformErrors: measurement.failures,
            }, { status: 502 });
        }

        // Keep the small legacy result list for the onboarding screen while
        // making every value an aggregate from the canonical receipt.
        const aggregateResults = measurement.engines
            .filter(engine => engine.successfulSamples > 0)
            .map(engine => ({
                platform: engine.engine,
                brandMentioned: engine.mentioned,
                mentionRate: engine.mentionRate,
                mentionPosition: engine.avgPosition,
                sentiment: engine.sentiment,
                samples: engine.successfulSamples,
                requestedSamples: engine.requestedSamples,
                confidence: engine.confidence,
                citations: engine.citations,
            }));
        const results = measurement.mode === 'battle'
            ? measurement.engines
                .filter((engine) => engine.successfulSamples > 0)
                .map((engine) => {
                    const engineResults = rawResults.filter((result): result is BattleResult =>
                        result.platform === engine.engine && 'winner' in result,
                    );
                    const winnerCounts = new Map<string, { label: string; count: number }>();
                    for (const result of engineResults) {
                        const label = result.winner?.trim();
                        if (!label) continue;
                        const key = label.toLocaleLowerCase();
                        const current = winnerCounts.get(key);
                        winnerCounts.set(key, { label: current?.label ?? label, count: (current?.count ?? 0) + 1 });
                    }
                    const rankedWinners = [...winnerCounts.values()].sort((a, b) => b.count - a.count);
                    const winner = rankedWinners[0] && rankedWinners[0].count > (rankedWinners[1]?.count ?? 0)
                        ? rankedWinners[0].label
                        : null;
                    const representative = engineResults.find((result) => result.winner?.toLocaleLowerCase() === winner?.toLocaleLowerCase())
                        ?? engineResults[0];
                    return {
                        ...representative,
                        platform: engine.engine,
                        brandMentioned: engine.mentioned,
                        mentionRate: engine.mentionRate,
                        mentionPosition: engine.avgPosition,
                        sentiment: engine.sentiment,
                        samples: engine.successfulSamples,
                        requestedSamples: engine.requestedSamples,
                        confidence: engine.confidence,
                        citations: engine.citations,
                        winner,
                        winnerCounts: rankedWinners,
                        winnerReason: winner
                            ? `${winner} led in ${rankedWinners[0].count} of ${engineResults.length} successful samples. ${representative?.winnerReason ?? ''}`.trim()
                            : `No stable winner: the ${engineResults.length} successful samples were tied or inconclusive.`,
                        response: representative
                            ? `Representative sample (1 of ${engineResults.length}):\n\n${representative.response}`
                            : '',
                    };
                })
            : aggregateResults;

        return NextResponse.json({
            success: true,
            results,
            visibilityScore: measurement.visibilityScore,
            scannedAt: measurement.completedAt,
            runStatus: measurement.status,
            persistence: measurement.persistence,
            platformErrors: measurement.failures.length > 0 ? measurement.failures : undefined,
            contractVersion: measurement.contractVersion,
            runId: measurement.runId,
            measurement,
        });
    } catch (error) {
        console.error('LLM scan error:', error);
        return NextResponse.json({ error: 'Failed to scan AI engines' }, { status: 500 });
    }
}
