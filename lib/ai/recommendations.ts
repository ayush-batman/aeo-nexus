/**
 * AEO Actionable Recommendations Engine
 * 
 * Analyzes scan results and generates specific, actionable recommendations
 * organized by priority. Each recommendation links to the relevant tool
 * in the platform (Forum Hub, Content Studio, Prompt Research, etc.)
 */

export interface Recommendation {
    id: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: RecommendationCategory;
    title: string;
    description: string;
    action: string;
    link?: string;       // Internal link to relevant tool
    linkLabel?: string;
    metric?: string;     // e.g. "Position #3 → aim for #1"
}

export type RecommendationCategory =
    | 'visibility'
    | 'content'
    | 'community'
    | 'technical'
    | 'competitor';

export const CATEGORY_CONFIG: Record<RecommendationCategory, { icon: string; label: string; color: string }> = {
    visibility: { icon: '👁️', label: 'Visibility', color: 'text-violet-400' },
    content: { icon: '📝', label: 'Content', color: 'text-blue-400' },
    community: { icon: '💬', label: 'Community', color: 'text-green-400' },
    technical: { icon: '⚙️', label: 'Technical', color: 'text-orange-400' },
    competitor: { icon: '⚔️', label: 'Competitive', color: 'text-red-400' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
    high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
    medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
    low: { label: 'Low', color: 'text-zinc-400', bgColor: 'bg-zinc-500/10 border-zinc-500/20' },
};

interface ScanData {
    prompt: string;
    brandName: string;
    brandMentioned: boolean;
    mentionPosition: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitorsMentioned: string[];
    competitorPositions: { name: string; position: number | null; sentiment: string }[];
    citations: { url: string; title: string; isOwnDomain: boolean }[];
    platform: string;
    response: string;
}

/**
 * Generate actionable recommendations based on scan results.
 * This runs entirely client-side — no API calls needed.
 */
export function generateRecommendations(
    scans: ScanData[],
    brandName: string,
): Recommendation[] {
    const recommendations: Recommendation[] = [];
    let idCounter = 0;
    const nextId = () => `rec-${++idCounter}`;

    // Aggregate stats across all scans
    const totalScans = scans.length;
    const mentionedScans = scans.filter(s => s.brandMentioned);
    const mentionRate = totalScans > 0 ? mentionedScans.length / totalScans : 0;
    const avgPosition = mentionedScans.length > 0
        ? mentionedScans.reduce((sum, s) => sum + (s.mentionPosition || 10), 0) / mentionedScans.length
        : null;
    const negativeScans = scans.filter(s => s.sentiment === 'negative');
    const allCompetitors = [...new Set(scans.flatMap(s => s.competitorsMentioned))];
    const ownCitations = scans.flatMap(s => s.citations.filter(c => c.isOwnDomain));
    const totalCitations = scans.flatMap(s => s.citations);
    const notMentionedScans = scans.filter(s => !s.brandMentioned);

    // ============================================================
    // RULE 1: Brand never mentioned
    // ============================================================
    if (mentionRate === 0 && totalScans > 0) {
        recommendations.push({
            id: nextId(),
            priority: 'critical',
            category: 'visibility',
            title: `${brandName} is invisible to AI`,
            description: `Across ${totalScans} scan(s), no LLM mentioned your brand. This means AI assistants don't know about ${brandName} or don't consider it relevant for these queries.`,
            action: 'Create structured FAQ content on your website targeting these exact queries. LLMs heavily cite FAQ pages with clear question-answer format.',
            link: '/dashboard/content-studio',
            linkLabel: 'Create Content',
        });

        recommendations.push({
            id: nextId(),
            priority: 'critical',
            category: 'community',
            title: 'Build Reddit & forum presence',
            description: 'LLMs learn from community discussions. If your brand isn\'t mentioned in Reddit, Quora, or industry forums, AI models won\'t know about you.',
            action: `Find relevant threads where people ask about your industry and contribute genuine, helpful responses mentioning ${brandName} naturally.`,
            link: '/dashboard/forum-hub',
            linkLabel: 'Find Threads',
        });
    }

    // ============================================================
    // RULE 2: Brand mentioned but low position
    // ============================================================
    if (mentionRate > 0 && avgPosition && avgPosition > 3) {
        recommendations.push({
            id: nextId(),
            priority: 'high',
            category: 'visibility',
            title: `Improve your ranking position (currently #${Math.round(avgPosition)})`,
            description: `${brandName} is mentioned but appears at position #${Math.round(avgPosition)} on average. Users rarely read past position #3 in AI responses.`,
            action: 'Increase your topical authority by publishing in-depth comparison and review content. Get mentioned by third-party review sites and industry publications.',
            metric: `Position #${Math.round(avgPosition)} → aim for #1-3`,
        });
    }

    // ============================================================
    // RULE 3: Brand mentioned at #1-3 — maintain position
    // ============================================================
    if (mentionRate > 0 && avgPosition && avgPosition <= 3) {
        recommendations.push({
            id: nextId(),
            priority: 'low',
            category: 'visibility',
            title: `Great position! Maintain your #${Math.round(avgPosition)} ranking`,
            description: `${brandName} appears at position #${Math.round(avgPosition)} — this is excellent. Focus on defending this position.`,
            action: 'Keep your content fresh and updated. Monitor competitors entering these queries. Set up scheduled scans to track changes.',
            link: '/dashboard/llm-tracker',
            linkLabel: 'Schedule Scans',
            metric: `Position #${Math.round(avgPosition)} ✅`,
        });
    }

    // ============================================================
    // RULE 4: Negative sentiment detected
    // ============================================================
    if (negativeScans.length > 0) {
        const platforms = [...new Set(negativeScans.map(s => s.platform))].join(', ');
        recommendations.push({
            id: nextId(),
            priority: 'critical',
            category: 'visibility',
            title: 'Negative sentiment detected',
            description: `${negativeScans.length} scan(s) returned negative sentiment about ${brandName} on ${platforms}. This damages trust when users ask AI about your brand.`,
            action: 'Investigate the source of negative mentions. Create positive customer testimonials, case studies, and success stories. Address complaints publicly on forums and review sites.',
            link: '/dashboard/forum-hub',
            linkLabel: 'Monitor Forums',
        });
    }

    // ============================================================
    // RULE 5: Competitors mentioned but you're not
    // ============================================================
    const competitorsOnlyScans = notMentionedScans.filter(s => s.competitorsMentioned.length > 0);
    if (competitorsOnlyScans.length > 0) {
        const topCompetitors = allCompetitors.slice(0, 3).join(', ');
        recommendations.push({
            id: nextId(),
            priority: 'critical',
            category: 'competitor',
            title: `Competitors are winning your queries`,
            description: `In ${competitorsOnlyScans.length} scan(s), competitors (${topCompetitors}) are mentioned but ${brandName} is not. You're losing visibility to competitors.`,
            action: `Create direct comparison content: "${brandName} vs ${allCompetitors[0] || 'Competitor'}" pages. These are high-intent queries where you should appear.`,
            link: '/dashboard/battle',
            linkLabel: 'Run Battle',
        });
    }

    // ============================================================
    // RULE 6: No citations from your domain
    // ============================================================
    if (totalCitations.length > 0 && ownCitations.length === 0) {
        recommendations.push({
            id: nextId(),
            priority: 'high',
            category: 'content',
            title: 'Your website is not being cited',
            description: `LLMs cited ${totalCitations.length} source(s) in their responses, but none point to your website. Your content isn't being used as a reference.`,
            action: 'Create authoritative, data-driven content on your website. Add schema markup (FAQ, HowTo, Article) to help AI models understand and cite your pages.',
            link: '/dashboard/content-studio',
            linkLabel: 'Audit Content',
        });
    }

    // ============================================================
    // RULE 7: Your domain IS being cited — good!
    // ============================================================
    if (ownCitations.length > 0) {
        recommendations.push({
            id: nextId(),
            priority: 'low',
            category: 'content',
            title: `Your site is being cited (${ownCitations.length} citation${ownCitations.length > 1 ? 's' : ''})`,
            description: `LLMs are citing your website as a source — this is a strong signal of authority. Keep building on this.`,
            action: 'Double down on the content types that are getting cited. Create more content in similar formats and topics.',
            metric: `${ownCitations.length} citation(s) ✅`,
        });
    }

    // ============================================================
    // RULE 8: Specific prompts where brand is missing
    // ============================================================
    if (notMentionedScans.length > 0 && notMentionedScans.length < totalScans) {
        const missingPrompts = notMentionedScans.slice(0, 2).map(s => `"${s.prompt}"`).join(', ');
        recommendations.push({
            id: nextId(),
            priority: 'high',
            category: 'content',
            title: `Create content for queries where you're missing`,
            description: `${brandName} isn't mentioned for: ${missingPrompts}. Create targeted content addressing these exact questions.`,
            action: 'Write blog posts, FAQ entries, or landing pages that directly answer these queries. Use the exact question as your H1 heading.',
            link: '/dashboard/content-studio',
            linkLabel: 'Create Content',
        });
    }

    // ============================================================
    // RULE 9: Schema markup suggestion (always relevant)
    // ============================================================
    if (mentionRate < 0.5) {
        recommendations.push({
            id: nextId(),
            priority: 'medium',
            category: 'technical',
            title: 'Add structured data markup',
            description: 'Schema markup (FAQ, HowTo, Product, Article) helps AI models understand your content and increases the chance of being cited.',
            action: 'Use the Content Studio to generate schema markup for your key pages. Focus on FAQPage and HowTo schemas for question-based queries.',
            link: '/dashboard/content-studio',
            linkLabel: 'Generate Schema',
        });
    }

    // ============================================================
    // RULE 10: Prompt research suggestion
    // ============================================================
    if (totalScans <= 3) {
        recommendations.push({
            id: nextId(),
            priority: 'medium',
            category: 'visibility',
            title: 'Run more scans to build a complete picture',
            description: `You've only run ${totalScans} scan(s). Run 10-20 scans with different prompts to understand your full AEO landscape.`,
            action: 'Use the Quick Check templates in Prompt Research to discover high-value prompts, then scan each one.',
            link: '/dashboard/prompts',
            linkLabel: 'Get Prompts',
        });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations.slice(0, 8); // Cap at 8 max
}
