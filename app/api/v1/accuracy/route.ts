import { withKey } from '@/lib/api-v1';

// GET /api/v1/accuracy?window=30d  — factual claims AI made about the brand,
// checked true/false/outdated/unverified against the brand's own site, each
// with its source. Unique to Aelo. (get_accuracy_verdict)
export async function GET(request: Request) {
  const window = new URL(request.url).searchParams.get('window') === '7d' ? '7d' : '30d';
  const days = window === '7d' ? 7 : 30;
  return withKey(request, 'read', async (ctx, admin) => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await admin
      .from('accuracy_claims')
      .select('claim_text, verdict, confidence, evidence_url, evidence_snippet, reasoning, created_at')
      .eq('workspace_id', ctx.workspaceId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    const claims = data || [];
    const breakdown: Record<string, number> = { true: 0, false: 0, outdated: 0, unverified: 0 };
    for (const c of claims) {
      const v = c.verdict as string;
      breakdown[v] = (breakdown[v] || 0) + 1;
    }
    const total = claims.length;
    const accuracyPct = total ? Math.round((breakdown.true / total) * 100) : null;

    return {
      window,
      total,
      accuracyPct,
      breakdown,
      note: 'accuracyPct is the share of checked claims that are true. Anything false or outdated is a claim an AI is repeating about you that a buyer will see.',
      claims,
    };
  });
}
