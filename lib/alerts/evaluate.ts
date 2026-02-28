import { createClient } from '@supabase/supabase-js';

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
    | 'citation_lost'
    | 'negative_sentiment'
    | 'hot_thread'
    | 'brand_forum_mention';

interface ScanData {
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: string | null;
    competitors_mentioned: string[] | null;
    citations: Array<{ url: string; is_own_domain?: boolean }> | null;
    platform: string;
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Check if an alert type is enabled for a workspace
 */
async function isAlertEnabled(workspaceId: string, alertType: AlertType): Promise<boolean> {
    const { data } = await supabaseAdmin
        .from('alert_preferences')
        .select('enabled')
        .eq('workspace_id', workspaceId)
        .eq('alert_type', alertType)
        .single();

    // Default to enabled for critical alerts
    if (!data) {
        return ['visibility_drop', 'competitor_overtake', 'zero_visibility', 'new_citation', 'negative_sentiment', 'hot_thread'].includes(alertType);
    }

    return data.enabled;
}

/**
 * Create a notification
 */
async function createNotification(
    workspaceId: string,
    type: AlertType,
    title: string,
    message: string,
    metadata?: Record<string, any>
) {
    const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
            workspace_id: workspaceId,
            type,
            title,
            message,
            metadata: metadata || {},
        });

    if (error) {
        console.error(`Failed to create notification [${type}]:`, error);
    }
}

/**
 * Evaluate scan results and trigger applicable alerts
 */
export async function evaluateAlerts(
    workspaceId: string,
    currentScans: ScanData[],
    previousScans?: ScanData[]
): Promise<void> {
    try {
        // 1. Zero visibility check
        const anyMentioned = currentScans.some(s => s.brand_mentioned);
        if (!anyMentioned && await isAlertEnabled(workspaceId, 'zero_visibility')) {
            await createNotification(
                workspaceId,
                'zero_visibility',
                '⚠️ Zero Visibility Alert',
                `Your brand was not mentioned in any of the ${currentScans.length} scans just completed.`,
                { scanCount: currentScans.length }
            );
        }

        // 2. Negative sentiment spike
        const negativeScans = currentScans.filter(s => s.sentiment === 'negative');
        if (negativeScans.length > 0 && await isAlertEnabled(workspaceId, 'negative_sentiment')) {
            await createNotification(
                workspaceId,
                'negative_sentiment',
                '😞 Negative Sentiment Detected',
                `${negativeScans.length} scan(s) returned negative sentiment on ${negativeScans.map(s => s.platform).join(', ')}.`,
                { platforms: negativeScans.map(s => s.platform) }
            );
        }

        // 3. Competitor overtake check
        if (previousScans && previousScans.length > 0 && await isAlertEnabled(workspaceId, 'competitor_overtake')) {
            const prevMentionRate = previousScans.filter(s => s.brand_mentioned).length / previousScans.length;
            const currMentionRate = currentScans.filter(s => s.brand_mentioned).length / currentScans.length;

            // Check if any competitor is mentioned more than the brand
            const competitorCounts: Record<string, number> = {};
            currentScans.forEach(s => {
                (s.competitors_mentioned || []).forEach(c => {
                    competitorCounts[c] = (competitorCounts[c] || 0) + 1;
                });
            });

            const brandMentions = currentScans.filter(s => s.brand_mentioned).length;
            for (const [competitor, count] of Object.entries(competitorCounts)) {
                if (count > brandMentions) {
                    await createNotification(
                        workspaceId,
                        'competitor_overtake',
                        '🏁 Competitor Overtake',
                        `${competitor} was mentioned ${count} times vs your brand's ${brandMentions} mentions.`,
                        { competitor, competitorMentions: count, brandMentions }
                    );
                    break; // One alert per batch
                }
            }
        }

        // 4. Visibility drop (compare with previous)
        if (previousScans && previousScans.length > 0 && await isAlertEnabled(workspaceId, 'visibility_drop')) {
            const prevRate = previousScans.filter(s => s.brand_mentioned).length / previousScans.length;
            const currRate = currentScans.filter(s => s.brand_mentioned).length / currentScans.length;

            if (prevRate > 0 && currRate < prevRate * 0.9) { // >10% drop
                const dropPct = Math.round((1 - currRate / prevRate) * 100);
                await createNotification(
                    workspaceId,
                    'visibility_drop',
                    '📉 Visibility Drop Detected',
                    `Your brand mention rate dropped ${dropPct}% compared to previous scans.`,
                    { previousRate: prevRate, currentRate: currRate, dropPercent: dropPct }
                );
            }
        }

        // 5. New citation earned
        if (await isAlertEnabled(workspaceId, 'new_citation')) {
            const ownCitations = currentScans
                .flatMap(s => (s.citations || []).filter(c => c.is_own_domain))
                .map(c => c.url);

            if (ownCitations.length > 0) {
                const uniqueCitations = [...new Set(ownCitations)];
                await createNotification(
                    workspaceId,
                    'new_citation',
                    '🎉 Your Domain Was Cited!',
                    `LLMs cited your domain ${uniqueCitations.length} time(s): ${uniqueCitations.slice(0, 3).join(', ')}`,
                    { citations: uniqueCitations }
                );
            }
        }
    } catch (err) {
        console.error('Alert evaluation error:', err);
    }
}
