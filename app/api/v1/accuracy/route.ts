import { withKey } from '@/lib/api-v1';

// GET /api/v1/accuracy?window=30d  — factual claims AI made about the brand,
// checked true/false/outdated/unverified against the brand's own site, each
// with its source. Unique to Aelo. (get_accuracy_verdict)
export async function GET(request: Request) {
  const window = new URL(request.url).searchParams.get('window') === '7d' ? '7d' : '30d';
  const days = window === '7d' ? 7 : 30;
  return withKey(request, 'read', async (ctx, admin) => {
    const data = await admin.accuracy(Date.now() - days * 86400000);

    const claims = data || [];
    const breakdown: Record<string, number> = { true: 0, false: 0, outdated: 0, unverified: 0 };
    for (const c of claims) {
      const v = c.verdict as string;
      breakdown[v] = (breakdown[v] || 0) + 1;
    }
    const total = claims.length;
    const checked = total - breakdown.unverified;
    const accuracyPct = checked ? Math.round((breakdown.true / checked) * 100) : null;

    return {
      window,
      total,
      checked,
      accuracyPct,
      breakdown,
      note: 'accuracyPct is the share of verified claims marked true; unverified claims are excluded. This response contains the latest 100 claims in the window, not necessarily every claim.',
      claims,
    };
  });
}
