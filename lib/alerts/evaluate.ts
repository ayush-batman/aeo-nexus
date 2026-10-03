import { compareCompatibleMentionMetrics, type ComparableMentionSample } from '../measurement/metrics';

/**
 * Alert Evaluation Engine
 * 
 * Checks scan results against alert rules and creates notifications
 * when conditions are met. Called after scan batches complete.
 */

type AlertType =
    | 'visibility_drop'
    | 'competitor_overtake'
    | 'zero_visibility'
    | 'new_citation'
    | 'negative_sentiment';

export interface ScanData {
    prompt: string;
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: string | null;
    competitors_mentioned: string[] | null;
    citations: Array<{
        url: string;
        is_own_domain?: boolean;
        provenance?: 'provider_citation' | 'link_mentioned' | 'unverified';
    }> | null;
    platform: string;
    provider_model: string | null;
    measurement_region: string | null;
    measurement_mode: string | null;
    scorer_version: string | null;
    measurement_contract_version: string | null;
    measurement_run_id: string | null;
    search_mode?: string | null;
    analyzer_method?: string | null;
    analyzer_model?: string | null;
    analyzer_prompt_version?: string | null;
    created_at: string;
}

export type MeasurementNotification = { type: AlertType; title: string; message: string; dedupeKey: string; metadata: Record<string, unknown> };

function comparable(scan: ScanData): ComparableMentionSample {
    return {
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
    };
}

function compatibilityKey(scan: ScanData): string | null {
    const values = [
        scan.prompt.trim(),
        scan.platform.trim().toLocaleLowerCase(),
        scan.provider_model?.trim(),
        scan.measurement_region?.trim(),
        scan.measurement_mode?.trim(),
        scan.scorer_version?.trim(),
        scan.measurement_contract_version?.trim(),
        scan.search_mode?.trim(), scan.analyzer_method?.trim(), scan.analyzer_model?.trim(), scan.analyzer_prompt_version?.trim(),
    ];
    return values.some((value) => !value) ? null : values.join('\u0000');
}

/** Keep only the most recent earlier measurement run for each exact cohort. */
export function selectPreviousAlertCohort(currentScans: ScanData[], previousScans: ScanData[]): ScanData[] {
    const currentStarts = new Map<string, number>();
    const currentRuns = new Set(currentScans.map(scan => scan.measurement_run_id));
    for (const scan of currentScans) {
        const key = compatibilityKey(scan), time = Date.parse(scan.created_at);
        if (key && Number.isFinite(time)) currentStarts.set(key, Math.min(time, currentStarts.get(key) ?? Infinity));
    }
    const selectedRun = new Map<string, string>();
    const selected: ScanData[] = [];
    for (const scan of [...previousScans].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
        const key = compatibilityKey(scan);
        const runId = scan.measurement_run_id;
        const time = Date.parse(scan.created_at);
        if (!key || !runId || currentRuns.has(runId) || !Number.isFinite(time) || !(time < (currentStarts.get(key) ?? -Infinity))) continue;
        const runForKey = selectedRun.get(key);
        if (!runForKey) selectedRun.set(key, runId);
        if ((runForKey ?? runId) === runId) selected.push(scan);
    }
    return selected;
}

export function newOwnCitationUrls(currentScans: ScanData[], previousScans: ScanData[]): string[] {
    const priorUrls = new Set(previousScans.flatMap((scan) =>
        (scan.citations ?? [])
            .filter((citation) => citation.is_own_domain && citation.provenance === 'provider_citation')
            .map((citation) => citation.url),
    ));
    return [...new Set(currentScans.flatMap((scan) =>
        (scan.citations ?? [])
            .filter((citation) => citation.is_own_domain && citation.provenance === 'provider_citation')
            .map((citation) => citation.url),
    ))].filter((url) => !priorUrls.has(url));
}

/**
 * Evaluate scan results and trigger applicable alerts
 */
export function evaluateAlerts(
    workspaceId: string,
    currentScans: ScanData[],
    previousScans: ScanData[],
    runId: string,
    historicalScans: ScanData[] = previousScans,
    preferences = new Map<string, boolean>(),
): MeasurementNotification[] {
    const notifications: MeasurementNotification[] = [];
    const createNotification = (_workspaceId: string, type: AlertType, title: string, message: string, dedupeKey: string, metadata: Record<string, unknown> = {}) => {
        notifications.push({ type, title, message, dedupeKey, metadata });
    };
        if (currentScans.length === 0) return notifications;
        const enabled = (type: AlertType) => preferences.get(type) ?? true;
        // 1. Zero visibility check
        const anyMentioned = currentScans.some(s => s.brand_mentioned);
        if (!anyMentioned && enabled('zero_visibility')) {
            createNotification(
                workspaceId,
                'zero_visibility',
                'Zero Visibility Alert',
                `Your brand was not mentioned in any of the ${currentScans.length} scans just completed.`,
                `measurement:${runId}:zero_visibility`,
                { scanCount: currentScans.length }
            );
        }

        // 2. Negative sentiment spike
        const negativeScans = currentScans.filter(s => s.sentiment === 'negative');
        if (negativeScans.length > 0 && enabled('negative_sentiment')) {
            createNotification(
                workspaceId,
                'negative_sentiment',
                'Negative Sentiment Detected',
                `${negativeScans.length} scan(s) returned negative sentiment on ${negativeScans.map(s => s.platform).join(', ')}.`,
                `measurement:${runId}:negative_sentiment`,
                { platforms: negativeScans.map(s => s.platform) }
            );
        }

        // 3. Competitor overtake check
        if (enabled('competitor_overtake')) {
            // Check if any competitor is mentioned more than the brand
            const competitorCounts = new Map<string, { name: string; count: number }>();
            currentScans.forEach(s => {
                const seen = new Set<string>();
                (s.competitors_mentioned || []).forEach(rawName => {
                    const name = rawName.trim();
                    const key = name.toLocaleLowerCase();
                    if (!key || seen.has(key)) return;
                    seen.add(key);
                    const current = competitorCounts.get(key);
                    competitorCounts.set(key, { name: current?.name ?? name, count: (current?.count ?? 0) + 1 });
                });
            });

            const brandMentions = currentScans.filter(s => s.brand_mentioned).length;
            for (const { name: competitor, count } of competitorCounts.values()) {
                if (count > brandMentions) {
                    createNotification(
                        workspaceId,
                        'competitor_overtake',
                        'Competitor mentioned more in this run',
                        `${competitor} was mentioned ${count} times vs your brand's ${brandMentions} mentions.`,
                        `measurement:${runId}:competitor_overtake`,
                        { competitor, competitorMentions: count, brandMentions }
                    );
                    break; // One alert per batch
                }
            }
        }

        // 4. Visibility drop (compare with previous)
        if (previousScans.length > 0 && enabled('visibility_drop')) {
            const comparison = compareCompatibleMentionMetrics(
                currentScans.map(comparable),
                previousScans.map(comparable),
            );
            const confidenceQualifiedDrop = comparison.status === 'comparable'
                && comparison.changePoints !== null
                && comparison.changePoints <= -10
                && comparison.current.confidence.interval !== null
                && comparison.previous.confidence.interval !== null
                && comparison.current.confidence.interval.upper < comparison.previous.confidence.interval.lower;

            if (confidenceQualifiedDrop) {
                createNotification(
                    workspaceId,
                    'visibility_drop',
                    'Visibility Drop Detected',
                    `Your brand mention rate dropped ${Math.abs(comparison.changePoints!)} points compared with the previous compatible measurement.`,
                    `measurement:${runId}:visibility_drop`,
                    {
                        previousRate: comparison.previous.mentionRate,
                        currentRate: comparison.current.mentionRate,
                        changePoints: comparison.changePoints,
                        previousSamples: comparison.previous.samples,
                        currentSamples: comparison.current.samples,
                    }
                );
            }
        }

        // 5. New citation earned
        if (enabled('new_citation')) {
            const ownCitations = newOwnCitationUrls(currentScans, historicalScans);

            if (ownCitations.length > 0) {
                createNotification(
                    workspaceId,
                    'new_citation',
                    'Your Domain Was Cited',
                    `LLMs cited ${ownCitations.length} page(s) from your domain that were not observed in the prior 30 days: ${ownCitations.slice(0, 3).join(', ')}`,
                    `measurement:${runId}:new_citation`,
                    { citations: ownCitations }
                );
            }
        }
    return notifications;
}
