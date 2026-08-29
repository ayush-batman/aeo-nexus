import { withKey, getWorkspaceBrand } from '@/lib/api-v1';
import { shareOfVoiceMetric } from '@/lib/measurement/metrics';

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
    const counts = new Map<string, { name: string; mentions: number }>();
    let youMentions = 0;
    for (const r of rows) {
      if (r.brand_mentioned) youMentions++;
      const comps = Array.isArray(r.competitors_mentioned) ? r.competitors_mentioned : [];
      const seen = new Set<string>();
      for (const c of comps) {
        const n = nameOf(c);
        const normalized = n?.trim().toLocaleLowerCase();
        if (n && normalized && !seen.has(normalized)) {
          seen.add(normalized);
          const existing = counts.get(normalized);
          counts.set(normalized, { name: existing?.name ?? n.trim(), mentions: (existing?.mentions ?? 0) + 1 });
        }
      }
    }

    const voice = shareOfVoiceMetric(rows.map((row) => ({
      brandMentioned: row.brand_mentioned,
      competitorsMentioned: Array.isArray(row.competitors_mentioned)
        ? row.competitors_mentioned.map(nameOf).filter((name): name is string => Boolean(name))
        : [],
    })));
    const totalMentions = voice.brandMentions + voice.competitorMentions;
    const you = { name: brand.name || 'You', mentions: youMentions, shareOfVoice: voice.sharePercent, isYou: true };
    const competitors = [...counts.values()]
      .map(({ name, mentions }) => ({
        name,
        mentions,
        shareOfVoice: totalMentions ? Math.round((mentions / totalMentions) * 100) : null,
        isYou: false,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    const ranking = [you, ...competitors].sort((a, b) => b.mentions - a.mentions);
    return {
      window: w,
      samples: rows.length,
      totalBrandMentions: totalMentions,
      you,
      ranking,
      note: 'Share of voice is each brand\'s share of all observed brand mentions; duplicate names within one answer count once.',
    };
  });
}
