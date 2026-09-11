import { withKey } from '@/lib/api-v1';
import { estimateMentionConfidence } from '@/lib/measurement/confidence';

// GET /api/v1/visibility/trend?window=90d  — daily visibility over time.
// (get_visibility_trend)
export async function GET(request: Request) {
  const w = new URL(request.url).searchParams.get('window') || '90d';
  const days = w === '180d' ? 180 : w === '30d' ? 30 : 90;
  return withKey(request, 'read', async (ctx, admin) => {
    const data = await admin.scans({ since: Date.now() - days * 86400000 });

    const byDay: Record<string, { mentions: number; total: number }> = {};
    for (const r of data || []) {
      const day = String(r.created_at).slice(0, 10);
      const d = byDay[day] || (byDay[day] = { mentions: 0, total: 0 });
      d.total++;
      if (r.brand_mentioned) d.mentions++;
    }
    const points = Object.entries(byDay).map(([date, d]) => {
      const confidence = estimateMentionConfidence(d.mentions, d.total);
      return {
        date,
        visibility: Math.round((d.mentions / d.total) * 100),
        samples: d.total,
        mentions: d.mentions,
        confidence: confidence.level,
        confidenceInterval: confidence.interval,
      };
    });
    return {
      window: w,
      points,
      comparisonStatus: 'descriptive_only',
      note: 'Daily visibility is the brand mention rate across successful samples; confidence uses a 95% Wilson interval. Prompt or model mix can differ by day, so these points do not by themselves prove a change.',
    };
  });
}
