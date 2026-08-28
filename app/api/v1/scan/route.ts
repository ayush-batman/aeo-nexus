import { scanLLM, getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { getEntitlements } from '@/lib/entitlements';
import { withKey, getWorkspaceBrand } from '@/lib/api-v1';

export const maxDuration = 60;

interface EngineAgg {
  mentions: number;
  positions: number[];
  sentiments: string[];
  citations: Array<{ url: string; title: string; is_own_domain: boolean }>;
  evidence: Array<{ sample: number; mentioned: boolean; position: number | null; sentiment: string | null; snippet: string }>;
}

function mode(arr: string[]): string | null {
  if (!arr.length) return null;
  const c: Record<string, number> = {};
  for (const s of arr) c[s] = (c[s] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}

function dedupeCitations(cites: EngineAgg['citations']): EngineAgg['citations'] {
  const seen = new Set<string>();
  const out: EngineAgg['citations'] = [];
  for (const c of cites) {
    if (c && typeof c.url === 'string' && !seen.has(c.url)) {
      seen.add(c.url);
      out.push(c);
    }
  }
  return out;
}

// POST /api/v1/scan  — fresh MULTI-SAMPLE scan for one buyer question.
// Asks each engine the same question `samples` times and returns per-engine
// mention rate, confidence, and the raw passes as evidence. (run_visibility_scan)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'read', async (ctx, admin) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';
    if (!prompt || !brandName) throw new Error('prompt and brandName are required');

    const samples = Math.min(8, Math.max(1, Number(body.samples) || 4));
    const brandDomain = typeof body.brandDomain === 'string' ? body.brandDomain : undefined;
    const competitors = Array.isArray(body.competitors)
      ? body.competitors.map(String)
      : (await getWorkspaceBrand(admin, ctx.workspaceId)).competitors;

    const available = getAvailablePlatforms().filter((p) => p.available).map((p) => p.platform);
    const ent = await getEntitlements(ctx.orgId);
    const platforms = available.filter((p) => ent.engines.includes(p)) as LLMPlatform[];
    if (platforms.length === 0) {
      throw new Error('No engines available on this plan. Upgrade to scan more engines.');
    }

    const agg: Record<string, EngineAgg> = {};
    const inserts: Record<string, unknown>[] = [];

    for (let i = 0; i < samples; i++) {
      const { results } = await scanLLM({
        prompt,
        brandName,
        brandDomain,
        competitors,
        platforms,
        mode: typeof body.mode === 'string' ? body.mode : undefined,
      });
      for (const r of results) {
        const a = agg[r.platform] || (agg[r.platform] = { mentions: 0, positions: [], sentiments: [], citations: [], evidence: [] });
        if (r.brandMentioned) a.mentions++;
        if (r.mentionPosition != null) a.positions.push(r.mentionPosition);
        if (r.sentiment) a.sentiments.push(r.sentiment);
        if (Array.isArray(r.citations)) a.citations.push(...r.citations);
        a.evidence.push({
          sample: i + 1,
          mentioned: r.brandMentioned,
          position: r.mentionPosition,
          sentiment: r.sentiment,
          snippet: (r.response || '').slice(0, 240),
        });
        inserts.push({
          workspace_id: ctx.workspaceId,
          platform: r.platform,
          prompt: r.prompt,
          response: r.response,
          brand_mentioned: r.brandMentioned,
          brand_variants: r.brandVariants,
          mention_position: r.mentionPosition,
          sentiment: r.sentiment,
          sentiment_score: r.sentimentScore,
          sentiment_reason: r.sentimentReason,
          competitors_mentioned: r.competitorsMentioned,
          citations: r.citations,
          list_items: r.listItems,
          confidence: r.confidence,
        });
      }
    }

    if (inserts.length) {
      const { error } = await admin.from('llm_scans').insert(inserts);
      if (error) console.error('[v1/scan] failed to persist scans:', error);
    }

    const engines = Object.entries(agg).map(([engine, a]) => {
      const total = a.evidence.length;
      const rate = total ? a.mentions / total : 0;
      const avgPosition = a.positions.length
        ? Math.round((a.positions.reduce((x, y) => x + y, 0) / a.positions.length) * 10) / 10
        : null;
      const agreement = Math.max(a.mentions, total - a.mentions) / (total || 1);
      const confidence = total >= 4 ? (agreement >= 0.75 ? 'high' : 'medium') : 'low';
      return {
        engine,
        mentioned: rate >= 0.5,
        mentionRate: Math.round(rate * 100) / 100,
        avgPosition,
        sentiment: mode(a.sentiments),
        samples: total,
        confidence,
        citations: dedupeCitations(a.citations),
        evidence: a.evidence,
      };
    });

    const visibility = engines.length
      ? Math.round(
          engines.reduce((sum, e) => {
            if (!e.mentioned) return sum;
            const posScore = e.avgPosition && e.avgPosition <= 3 ? 90 : e.avgPosition && e.avgPosition <= 5 ? 70 : 55;
            return sum + Math.round(e.mentionRate * posScore);
          }, 0) / engines.length,
        )
      : 0;

    return {
      prompt,
      brandName,
      samples,
      visibility,
      engines,
      note: 'Each engine was asked the same question `samples` times. mentionRate and confidence reflect agreement across samples; evidence holds every raw pass so the number is defensible.',
    };
  });
}
