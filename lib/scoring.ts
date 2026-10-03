/**
 * Centralized Scoring Module
 * 
 * Contains all scoring algorithms for:
 * - Forum thread opportunity scores
 * - Trend detection
 */

export interface OpportunityScoreFactors {
    upvotes: number;
    comments: number;
    ageHours: number;
    intent: 'buying' | 'compare' | 'research' | 'other';
    keywordMatches: number;
    isEngaged: boolean;
    platform: string;
}

export interface TrendData {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    direction: 'up' | 'down' | 'stable';
}

/**
 * Platform weights for scoring
 */
const PLATFORM_WEIGHTS: Record<string, number> = {
    reddit: 1.0,
    quora: 0.9,
    twitter: 0.8,
    hackernews: 1.1,
    other: 0.7,
};

/**
 * Calculate opportunity score for a forum thread
 */
export function calculateOpportunityScore(factors: OpportunityScoreFactors): number {
    const platformWeight = PLATFORM_WEIGHTS[factors.platform] || 1.0;
    let score = 0;

    // Engagement score (max 30 points)
    const upvoteScore = Math.min(15, factors.upvotes * 0.15);
    const commentScore = Math.min(15, factors.comments * 0.3);
    score += upvoteScore + commentScore;

    // Recency score (max 25 points)
    if (factors.ageHours < 1) score += 25;
    else if (factors.ageHours < 6) score += 22;
    else if (factors.ageHours < 12) score += 18;
    else if (factors.ageHours < 24) score += 15;
    else if (factors.ageHours < 48) score += 12;
    else if (factors.ageHours < 72) score += 10;
    else if (factors.ageHours < 168) score += 5;
    else score += 2;

    // Intent score (max 25 points)
    switch (factors.intent) {
        case 'buying':
            score += 25;
            break;
        case 'compare':
            score += 20;
            break;
        case 'research':
            score += 15;
            break;
        default:
            score += 5;
    }

    // Keyword match bonus (max 15 points)
    score += Math.min(15, factors.keywordMatches * 3);

    // Engagement penalty
    if (factors.isEngaged) {
        score -= 20;
    }

    // Apply platform weight
    score *= platformWeight;

    // Apply quality floor/ceiling
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Detect intent from thread title/content
 */
export function detectIntent(text: string): 'buying' | 'compare' | 'research' | 'other' {
    const lower = text.toLowerCase();

    const buyingKeywords = [
        'recommend', 'best', 'should i buy', 'worth it', 'looking for',
        'help me choose', 'suggestions', 'under ₹', 'under $', 'under rs',
        'budget', 'which one', 'what should', 'need help', 'advice'
    ];

    const compareKeywords = [
        ' vs ', 'versus', 'compared to', 'difference between',
        ' or ', 'better than', 'alternative to'
    ];

    const researchKeywords = [
        'how to', 'what is', 'why', 'experience with', 'review',
        'thoughts on', 'opinion', 'anyone tried'
    ];

    if (buyingKeywords.some(k => lower.includes(k))) return 'buying';
    if (compareKeywords.some(k => lower.includes(k))) return 'compare';
    if (researchKeywords.some(k => lower.includes(k))) return 'research';

    return 'other';
}

/**
 * Calculate trend between two time periods
 */
export function calculateTrend(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous === 0
        ? (current > 0 ? 100 : 0)
        : Math.round((change / previous) * 100);

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) direction = 'up';
    else if (changePercent < -5) direction = 'down';

    return {
        current,
        previous,
        change,
        changePercent,
        direction,
    };
}

/**
 * Aggregate visibility scores by period (for trend analysis)
 */
export function aggregateByPeriod(
    scans: { created_at: string; visibility_score: number }[],
    periodDays: number = 7
): { current: number; previous: number } {
    const now = new Date();
    const periodMs = periodDays * 24 * 60 * 60 * 1000;

    const currentPeriodStart = new Date(now.getTime() - periodMs);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodMs);

    const currentScans = scans.filter(s => new Date(s.created_at) >= currentPeriodStart);
    const previousScans = scans.filter(s => {
        const date = new Date(s.created_at);
        return date >= previousPeriodStart && date < currentPeriodStart;
    });

    const currentAvg = currentScans.length > 0
        ? currentScans.reduce((sum, s) => sum + s.visibility_score, 0) / currentScans.length
        : 0;

    const previousAvg = previousScans.length > 0
        ? previousScans.reduce((sum, s) => sum + s.visibility_score, 0) / previousScans.length
        : 0;

    return { current: Math.round(currentAvg), previous: Math.round(previousAvg) };
}

/**
 * Get priority label from score
 */
export function getPriorityFromScore(score: number): {
    label: string;
    emoji: string;
    level: 'critical' | 'high' | 'medium' | 'low';
} {
    if (score >= 80) return { label: 'Critical', emoji: '', level: 'critical' };
    if (score >= 60) return { label: 'High',     emoji: '', level: 'high' };
    if (score >= 40) return { label: 'Medium',   emoji: '', level: 'medium' };
    return { label: 'Low', emoji: '', level: 'low' };
}
