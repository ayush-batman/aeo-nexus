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
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await admin
      .from('llm_scans')
      .select('citations')
      .eq('workspace_id', ctx.workspaceId)
      .gte('created_at', since)
      .limit(1000);

    const domains: Record<string, { citations: number; citesYou: boolean }> = {};
    for (const r of data || []) {
      const cites = Array.isArray(r.citations) ? r.citations : [];
      for (const c of cites) {
        if (!c || typeof c.url !== 'string') continue;
        const d = domainOf(c.url);
        const rec = domains[d] || (domains[d] = { citations: 0, citesYou: false });
        rec.citations++;
        // Records vary: newer scans store is_own_domain, older ones isOwnDomain.
        if (c.is_own_domain ?? c.isOwnDomain) rec.citesYou = true;
      }
    }

    const sources = Object.entries(domains)
      .map(([domain, v]) => ({ domain, citations: v.citations, isYou: v.citesYou }))
      .sort((a, b) => b.citations - a.citations)
      .slice(0, limit);

    return {
      note: 'The domains AI reads to answer your category, most-cited first. The ones marked isYou:false and near the top are where to earn a mention next. Aelo shows you where to earn a citation; it does not sell you one.',
      sources,
    };
  });
}
