import { withKey } from '@/lib/api-v1';

// GET /api/v1/visibility/trend?window=90d  — daily visibility over time.
// (get_visibility_trend)
export async function GET(request: Request) {
  const w = new URL(request.url).searchParams.get('window') || '90d';
  const days = w === '180d' ? 180 : w === '30d' ? 30 : 90;
  return withKey(request, 'read', async (ctx, admin) => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await admin
      .from('llm_scans')
      .select('brand_mentioned, created_at')
      .eq('workspace_id', ctx.workspaceId)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    const byDay: Record<string, { mentions: number; total: number }> = {};
    for (const r of data || []) {
      const day = String(r.created_at).slice(0, 10);
      const d = byDay[day] || (byDay[day] = { mentions: 0, total: 0 });
      d.total++;
      if (r.brand_mentioned) d.mentions++;
    }
    const points = Object.entries(byDay).map(([date, d]) => ({
      date,
      visibility: Math.round((d.mentions / d.total) * 100),
      samples: d.total,
    }));
    return { window: w, points };
  });
}
