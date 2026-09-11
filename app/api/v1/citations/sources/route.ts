import { withKey } from '@/lib/api-v1';

// GET /api/v1/citations/sources?limit=20  — the domains that shape answers in
// your category, ranked by how often engines cite them. (find_citation_sources)
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export async function GET(request: Request) {
  const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 20));
  return withKey(request, 'read', async (ctx, admin) => {
    const data = await admin.scans({ since: Date.now() - 90 * 86400000 });

    const domains: Record<string, { citations: number; citesYou: boolean }> = {};
    for (const r of data || []) {
      const cites = Array.isArray(r.citations) ? r.citations : [];
      for (const c of cites) {
        if (!c || typeof c.url !== 'string') continue;
        if (c.provenance !== 'provider_citation') continue;
        const d = domainOf(c.url);
        const rec = domains[d] || (domains[d] = { citations: 0, citesYou: false });
        rec.citations++;
        // Records vary: newer scans store is_own_domain, older ones isOwnDomain.
        if (c.is_own_domain) rec.citesYou = true;
      }
    }

    const sources = Object.entries(domains)
      .map(([domain, v]) => ({ domain, citations: v.citations, isYou: v.citesYou }))
      .sort((a, b) => b.citations - a.citations)
      .slice(0, limit);

    return {
      note: 'Provider-backed citation domains for your category, most-cited first. Links merely mentioned in generated prose and unverified legacy rows are excluded.',
      sources,
    };
  });
}
