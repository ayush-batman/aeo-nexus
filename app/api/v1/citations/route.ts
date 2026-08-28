import { withKey } from '@/lib/api-v1';

// GET /api/v1/citations?window=30d&citesYou=&limit=50  — the actual URLs
// engines pulled from, the receipts. (list_citations)
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const w = url.searchParams.get('window') || '30d';
  const days = w === '7d' ? 7 : w === '90d' ? 90 : 30;
  const citesYouParam = url.searchParams.get('citesYou');
  const citesYou = citesYouParam === null ? undefined : citesYouParam === 'true';
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));

  return withKey(request, 'read', async (ctx, admin) => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await admin
      .from('llm_scans')
      .select('platform, prompt, citations')
      .eq('workspace_id', ctx.workspaceId)
      .gte('created_at', since)
      .limit(500);

    const out: Array<{ url: string; domain: string; title: string; citesYou: boolean; engine: string; prompt: string }> = [];
    for (const r of data || []) {
      const cites = Array.isArray(r.citations) ? r.citations : [];
      for (const c of cites) {
        if (!c || typeof c.url !== 'string') continue;
        const isOwn = Boolean(c.is_own_domain);
        if (citesYou !== undefined && isOwn !== citesYou) continue;
        out.push({ url: c.url, domain: domainOf(c.url), title: c.title || '', citesYou: isOwn, engine: r.platform, prompt: r.prompt });
      }
    }
    return { window: w, count: out.length, citations: out.slice(0, limit) };
  });
}
