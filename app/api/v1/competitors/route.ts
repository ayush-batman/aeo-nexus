import { withKey, getWorkspaceBrand } from '@/lib/api-v1';

// GET /api/v1/competitors?window=30d  — share of voice: how often each brand
// gets named in answers about your category, you included. (compare_competitors)
function nameOf(x: unknown): string | null {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object' && 'name' in x) return String((x as { name: unknown }).name);
  return null;
}

export async function GET(request: Request) {
  const w = new URL(request.url).searchParams.get('window') || '30d';
  const days = w === '7d' ? 7 : w === '90d' ? 90 : 30;
  return withKey(request, 'read', async (ctx, admin) => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const brand = await getWorkspaceBrand(admin, ctx.workspaceId);
    const { data } = await admin
      .from('llm_scans')
      .select('brand_mentioned, competitors_mentioned')
      .eq('workspace_id', ctx.workspaceId)
      .gte('created_at', since);

    const rows = data || [];
    const total = rows.length;
    const counts: Record<string, number> = {};
    let youMentions = 0;
    for (const r of rows) {
      if (r.brand_mentioned) youMentions++;
      const comps = Array.isArray(r.competitors_mentioned) ? r.competitors_mentioned : [];
      const seen = new Set<string>();
      for (const c of comps) {
        const n = nameOf(c);
        if (n && !seen.has(n.toLowerCase())) {
          seen.add(n.toLowerCase());
          counts[n] = (counts[n] || 0) + 1;
        }
      }
    }

    const you = { name: brand.name || 'You', mentions: youMentions, shareOfVoice: total ? Math.round((youMentions / total) * 100) : 0, isYou: true };
    const competitors = Object.entries(counts)
      .map(([name, mentions]) => ({ name, mentions, shareOfVoice: total ? Math.round((mentions / total) * 100) : 0, isYou: false }))
      .sort((a, b) => b.mentions - a.mentions);

    const ranking = [you, ...competitors].sort((a, b) => b.mentions - a.mentions);
    return { window: w, samples: total, you, ranking };
  });
}
