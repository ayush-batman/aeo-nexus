import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/data-access';

interface CitationSource {
    type: string;
    label: string;
    count: number;
    percentage: number;
    urls: string[];
}

interface CitationAnalysis {
    sources: CitationSource[];
    totalCitations: number;
    ownDomainCitations: number;
    gaps: string[];
    topCitedUrls: { url: string; count: number; type: string }[];
}

// Classify a URL into a citation source type
function classifyUrl(url: string): { type: string; label: string } {
    const lower = url.toLowerCase();

    // Video platforms
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { type: 'youtube', label: 'YouTube' };
    if (lower.includes('vimeo.com')) return { type: 'vimeo', label: 'Vimeo' };

    // UGC / community platforms
    if (lower.includes('reddit.com')) return { type: 'reddit', label: 'Reddit' };
    if (lower.includes('quora.com')) return { type: 'quora', label: 'Quora' };
    if (lower.includes('stackoverflow.com') || lower.includes('stackexchange.com')) return { type: 'stackoverflow', label: 'Stack Overflow' };

    // Major tier-1 affiliates/publishers
    if (lower.includes('forbes.com')) return { type: 'tier1_affiliate', label: 'Forbes' };
    if (lower.includes('techradar.com')) return { type: 'tier1_affiliate', label: 'TechRadar' };
    if (lower.includes('investopedia.com')) return { type: 'tier1_affiliate', label: 'Investopedia' };
    if (lower.includes('allrecipes.com')) return { type: 'tier1_affiliate', label: 'AllRecipes' };
    if (lower.includes('goodhousekeeping.com')) return { type: 'tier1_affiliate', label: 'Good Housekeeping' };
    if (lower.includes('g2.com') || lower.includes('capterra.com') || lower.includes('trustradius.com'))
        return { type: 'review_site', label: 'Review Site' };
    if (lower.includes('pcmag.com') || lower.includes('cnet.com') || lower.includes('theverge.com') || lower.includes('techcrunch.com'))
        return { type: 'tech_media', label: 'Tech Media' };

    // Wikipedia
    if (lower.includes('wikipedia.org')) return { type: 'wikipedia', label: 'Wikipedia' };

    // News sites
    if (lower.includes('nytimes.com') || lower.includes('bbc.com') || lower.includes('reuters.com') || lower.includes('cnn.com'))
        return { type: 'news', label: 'News' };

    // GitHub / docs
    if (lower.includes('github.com')) return { type: 'github', label: 'GitHub' };
    if (lower.includes('docs.') || lower.includes('documentation')) return { type: 'docs', label: 'Documentation' };

    // Generic blog detection
    if (lower.includes('blog') || lower.includes('medium.com') || lower.includes('substack.com') || lower.includes('hashnode'))
        return { type: 'blog', label: 'Blog' };

    return { type: 'other', label: 'Other' };
}

const ALL_SOURCE_TYPES = [
    'youtube', 'reddit', 'quora', 'tier1_affiliate', 'review_site',
    'tech_media', 'blog', 'news', 'github', 'docs', 'wikipedia', 'other',
];

export async function GET(request: NextRequest) {
    try {
        const workspaceId = await getCurrentWorkspaceId();
        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = await createClient();

        // Get all scans with citations
        const { data: scans, error } = await supabase
            .from('llm_scans')
            .select('citations, platform')
            .eq('workspace_id', workspaceId)
            .not('citations', 'is', null)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) {
            console.error('Citations query error:', error);
            return NextResponse.json({ error: 'Failed to fetch citations' }, { status: 500 });
        }

        // Aggregate citations
        const sourceMap: Record<string, { count: number; urls: Set<string>; label: string }> = {};
        const urlCounts: Record<string, { count: number; type: string }> = {};
        let totalCitations = 0;
        let ownDomainCitations = 0;

        for (const scan of (scans || [])) {
            const citations = scan.citations as Array<{ url: string; title?: string; is_own_domain?: boolean }> | null;
            if (!citations || !Array.isArray(citations)) continue;

            for (const cit of citations) {
                if (!cit.url) continue;
                totalCitations++;

                if (cit.is_own_domain) {
                    ownDomainCitations++;
                }

                const classified = classifyUrl(cit.url);

                if (!sourceMap[classified.type]) {
                    sourceMap[classified.type] = { count: 0, urls: new Set(), label: classified.label };
                }
                sourceMap[classified.type].count++;
                sourceMap[classified.type].urls.add(cit.url);

                // Track individual URL counts
                if (!urlCounts[cit.url]) {
                    urlCounts[cit.url] = { count: 0, type: classified.type };
                }
                urlCounts[cit.url].count++;
            }
        }

        // Build sources array
        const sources: CitationSource[] = Object.entries(sourceMap)
            .map(([type, data]) => ({
                type,
                label: data.label,
                count: data.count,
                percentage: totalCitations > 0 ? Math.round((data.count / totalCitations) * 100) : 0,
                urls: Array.from(data.urls).slice(0, 5),
            }))
            .sort((a, b) => b.count - a.count);

        // Identify citation gaps
        const presentTypes = new Set(sources.map(s => s.type));
        const gaps: string[] = [];
        const gapLabels: Record<string, string> = {
            youtube: 'YouTube — Create video content for niche topics',
            reddit: 'Reddit — Participate authentically in relevant communities',
            quora: 'Quora — Answer questions with genuine expertise',
            tier1_affiliate: 'Tier-1 Affiliates (Forbes, etc.) — Consider paid affiliate mentions',
            review_site: 'Review Sites (G2, Capterra) — Get listed on review platforms',
            blog: 'Blogs — Aim for mentions on relevant industry blogs',
            tech_media: 'Tech Media — Pursue press coverage',
        };

        for (const [type, label] of Object.entries(gapLabels)) {
            if (!presentTypes.has(type)) {
                gaps.push(label);
            }
        }

        // Top cited URLs
        const topCitedUrls = Object.entries(urlCounts)
            .map(([url, data]) => ({ url, count: data.count, type: data.type }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const analysis: CitationAnalysis = {
            sources,
            totalCitations,
            ownDomainCitations,
            gaps,
            topCitedUrls,
        };

        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Error analyzing citations:', error);
        return NextResponse.json({ error: 'Failed to analyze citations' }, { status: 500 });
    }
}
