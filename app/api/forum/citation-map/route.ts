import { NextResponse } from 'next/server';
import { getCurrentWorkspaceContext } from '@/lib/data-access';
import { createAdminClient } from '@/lib/supabase/admin';

// The citation map — ranks the domains the LLMs actually cited across ALL
// scans for this workspace. This tells the customer where the LLMs source
// their answers *for their category*, not everyone's — the Sage improvement
// over generic 'go post on Reddit' advice.

type Citation = { url: string; title: string; isOwnDomain?: boolean };
type ScanRow  = { platform: string; citations: Citation[] | null; created_at: string };

interface SourceRow {
    domain:           string;
    displayName:      string;
    tier:             1 | 2 | 3;   // 1 = top 10, 2 = middle, 3 = long tail
    totalCitations:   number;
    distinctScans:    number;
    scanCoveragePct:  number;      // fraction of scans that cited this domain
    isOwnDomain:      boolean;
    platformCounts:   Record<string, number>;
    subSources:       { sub: string; count: number }[]; // e.g. reddit → r/india etc.
    exampleUrls:      string[];    // up to 3 sample URLs
}

// Known category → readable name. Keeps the domain-only rows from looking raw.
const DISPLAY_NAMES: Record<string, string> = {
    'reddit.com':          'Reddit',
    'stackoverflow.com':   'Stack Overflow',
    'stackexchange.com':   'Stack Exchange',
    'youtube.com':         'YouTube',
    'youtu.be':            'YouTube',
    'news.ycombinator.com':'Hacker News',
    'quora.com':           'Quora',
    'g2.com':              'G2',
    'capterra.com':        'Capterra',
    'trustpilot.com':      'Trustpilot',
    'trustradius.com':     'TrustRadius',
    'medium.com':          'Medium',
    'dev.to':              'DEV Community',
    'substack.com':        'Substack',
    'producthunt.com':     'Product Hunt',
    'alternativeto.net':   'AlternativeTo',
    'github.com':          'GitHub',
    'linkedin.com':        'LinkedIn',
    'wikipedia.org':       'Wikipedia',
    'notion.so':           'Notion',
    'notion.com':          'Notion',
    'twitter.com':         'X (Twitter)',
    'x.com':               'X (Twitter)',
    'facebook.com':        'Facebook',
};

function normalizeDomain(url: string): string | null {
    try {
        const u = new URL(url);
        let host = u.hostname.toLowerCase();
        if (host.startsWith('www.'))    host = host.slice(4);
        if (host.startsWith('forums.')) host = host.slice(7);
        if (host.startsWith('old.'))    host = host.slice(4);
        if (host.startsWith('m.'))      host = host.slice(2);
        // Collapse country-code subdomains for well-known consumer sites.
        if (/^(in|uk|us|de|fr|jp)\./.test(host)) host = host.slice(3);
        return host;
    } catch {
        return null;
    }
}

// Reddit / Stack Exchange / YouTube have meaningful sub-groupings inside the domain.
function extractSubSource(domain: string, url: string): string | null {
    try {
        const path = new URL(url).pathname;
        if (domain === 'reddit.com') {
            const m = path.match(/^\/r\/([^/]+)/i);
            return m ? `r/${m[1]}` : null;
        }
        if (domain === 'stackexchange.com') {
            // stackexchange.com/questions/… doesn't identify sub-site
            return null;
        }
        if (domain === 'youtube.com') {
            const m = path.match(/^\/(@[^/]+|c\/[^/]+|channel\/[^/]+)/i);
            return m ? m[1] : null;
        }
        return null;
    } catch { return null; }
}

// Rough tiering — used for badges. Data-driven within the workspace, not
// universal (a source that appears in half your scans is tier 1 for YOU).
function tierOf(coveragePct: number): 1 | 2 | 3 {
    if (coveragePct >= 25) return 1;
    if (coveragePct >= 8)  return 2;
    return 3;
}

export async function GET() {
    const context = await getCurrentWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();
    const { data: scans, error } = await db
        .from('llm_scans')
        .select('platform, citations, created_at')
        .eq('workspace_id', context.workspaceId)
        .not('citations', 'is', null);

    if (error) {
        console.error('[citation-map]', error);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }

    const rows = (scans ?? []) as ScanRow[];
    const totalScansWithCites = rows.filter(r => (r.citations?.length ?? 0) > 0).length;

    // Aggregate.
    const byDomain = new Map<string, {
        domain: string;
        total:  number;
        scanIds:Set<number>;      // approximated by index, since we don't select id
        platforms: Map<string, number>;
        subs:      Map<string, number>;
        examples:  Set<string>;
        isOwnDomain: boolean;
    }>();

    rows.forEach((scan, i) => {
        const cites = scan.citations ?? [];
        const dedupedForThisScan = new Set<string>();
        for (const c of cites) {
            const domain = normalizeDomain(c.url);
            if (!domain) continue;
            let entry = byDomain.get(domain);
            if (!entry) {
                entry = {
                    domain,
                    total:      0,
                    scanIds:    new Set(),
                    platforms:  new Map(),
                    subs:       new Map(),
                    examples:   new Set(),
                    isOwnDomain: false,
                };
                byDomain.set(domain, entry);
            }
            entry.total += 1;
            if (!dedupedForThisScan.has(domain)) {
                entry.scanIds.add(i);
                dedupedForThisScan.add(domain);
            }
            entry.platforms.set(scan.platform, (entry.platforms.get(scan.platform) ?? 0) + 1);
            const sub = extractSubSource(domain, c.url);
            if (sub) entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1);
            if (entry.examples.size < 3) entry.examples.add(c.url);
            if (c.isOwnDomain) entry.isOwnDomain = true;
        }
    });

    const totalDenom = Math.max(totalScansWithCites, 1);
    const sources: SourceRow[] = Array.from(byDomain.values())
        .map(e => {
            const scanCoveragePct = Math.round((e.scanIds.size / totalDenom) * 100);
            const subSources = Array.from(e.subs.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([sub, count]) => ({ sub, count }));
            return {
                domain:          e.domain,
                displayName:     DISPLAY_NAMES[e.domain] ?? e.domain,
                tier:            tierOf(scanCoveragePct),
                totalCitations:  e.total,
                distinctScans:   e.scanIds.size,
                scanCoveragePct,
                isOwnDomain:     e.isOwnDomain,
                platformCounts:  Object.fromEntries(e.platforms),
                subSources,
                exampleUrls:     Array.from(e.examples),
            };
        })
        .sort((a, b) => {
            if (b.scanCoveragePct !== a.scanCoveragePct) return b.scanCoveragePct - a.scanCoveragePct;
            return b.totalCitations - a.totalCitations;
        });

    return NextResponse.json({
        totalScansAnalyzed: totalScansWithCites,
        totalScansAll:      rows.length,
        uniqueDomains:      sources.length,
        sources,
    });
}
