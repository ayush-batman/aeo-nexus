type Citation = {
    url: string;
    title: string;
    isOwnDomain?: boolean;
    is_own_domain?: boolean;
    provenance?: string;
};
type ScanRow = { id: string; platform: string; response: string; failure_code?: string | null; citations: Citation[] | null; created_at: string };

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
    strategyNote:     string | null;
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
        if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
        let host = u.hostname.toLowerCase();
        if (host.startsWith('www.'))    host = host.slice(4);
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

// Rough tiering, used for badges. Data-driven within the workspace, not
// universal (a source that appears in half your scans is tier 1 for YOU).
function tierOf(coveragePct: number): 1 | 2 | 3 {
    if (coveragePct >= 25) return 1;
    if (coveragePct >= 8)  return 2;
    return 3;
}


export function buildCitationMap(scans: ScanRow[]) {
    const rows = scans.filter(scan => !scan.failure_code && scan.response.trim());
    const totalScansWithCites = rows.filter(scan => scan.citations?.some(c => c.provenance === "provider_citation" && normalizeDomain(c.url))).length;
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
        const urls = new Set<string>();
        for (const c of cites) {
            if (c.provenance !== 'provider_citation' || urls.has(c.url)) continue;
            urls.add(c.url);
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
            if (c.is_own_domain ?? c.isOwnDomain) entry.isOwnDomain = true;
        }
    });

    const totalDenom = Math.max(rows.length, 1);
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
                strategyNote:    'Review the cited pages for relevant, accurate information gaps. Citation frequency in these samples does not prove a universal source weight or guarantee a future mention.',
            };
        })
        .sort((a, b) => {
            if (b.scanCoveragePct !== a.scanCoveragePct) return b.scanCoveragePct - a.scanCoveragePct;
            return b.totalCitations - a.totalCitations;
        });

    return {
        totalScansAnalyzed: rows.length,
        scansWithProviderCitations: totalScansWithCites,
        totalScansAll:      rows.length,
        uniqueDomains:      sources.length,
        sources,
    };
}
