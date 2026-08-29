import { scanLLM, getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { randomUUID } from 'node:crypto';
import { getEntitlements, reserveScanQuota } from '@/lib/entitlements';
import { ApiV1Error, withKey, getWorkspaceBrand } from '@/lib/api-v1';
import type { CitationEvidence } from '@/lib/types';

export const maxDuration = 60;

interface EngineAgg {
  mentions: number;
  positions: number[];
  sentiments: string[];
  citations: CitationEvidence[];
  evidence: Array<{ sample: number; sampleId: string; mentioned: boolean; position: number | null; sentiment: string | null; snippet: string }>;
}

function mode(arr: string[]): string | null {
  if (!arr.length) return null;
  const c: Record<string, number> = {};
  for (const s of arr) c[s] = (c[s] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}

function dedupeCitations(cites: EngineAgg['citations']): EngineAgg['citations'] {
  const out: EngineAgg['citations'] = [];
  const indexByUrl = new Map<string, number>();
  for (const c of cites) {
    if (!c || typeof c.url !== 'string') continue;
    const existingIndex = indexByUrl.get(c.url);
    if (existingIndex === undefined) {
      indexByUrl.set(c.url, out.length);
      out.push(c);
    } else if (out[existingIndex].provenance !== 'provider_citation' && c.provenance === 'provider_citation') {
      out[existingIndex] = c;
    }
  }
  return out;
}

// POST /api/v1/scan  — fresh MULTI-SAMPLE scan for one buyer question.
// Asks each engine the same question `samples` times and returns per-engine
// mention rate, confidence, and the raw passes as evidence. (run_visibility_scan)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'measure', async (ctx, admin) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';
    if (!prompt || !brandName) {
      throw new ApiV1Error(400, 'invalid_scan_request', 'prompt and brandName are required');
    }

    const samples = Math.min(8, Math.max(1, Number(body.samples) || 4));
    const brandDomain = typeof body.brandDomain === 'string' ? body.brandDomain : undefined;
    const competitors = Array.isArray(body.competitors)
      ? body.competitors.map(String)
      : (await getWorkspaceBrand(admin, ctx.workspaceId)).competitors;

    const available = getAvailablePlatforms().filter((p) => p.available).map((p) => p.platform);
    const ent = await getEntitlements(ctx.orgId, admin);
    const platforms = available.filter((p) => ent.engines.includes(p)) as LLMPlatform[];
    if (platforms.length === 0) {
      throw new ApiV1Error(503, 'no_engines_available', 'No entitled engines are currently configured.');
    }

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    if (idempotencyKey && idempotencyKey.length > 100) {
      throw new ApiV1Error(400, 'invalid_idempotency_key', 'Idempotency-Key must be 100 characters or fewer.');
    }
    const requestId = `${ctx.keyId}:${idempotencyKey || randomUUID()}`;
    const reservation = await reserveScanQuota(ctx.orgId, requestId, admin);
    if (reservation === 'denied') {
      throw new ApiV1Error(429, 'weekly_scan_quota_exceeded', 'Weekly scan quota exceeded.');
    }
    if (reservation === 'duplicate') {
      throw new ApiV1Error(409, 'duplicate_scan_request', 'This Idempotency-Key has already been used.');
    }

    const agg: Record<string, EngineAgg> = {};
    const inserts: Record<string, unknown>[] = [];
    const failures: Array<{ sample: number; platform: LLMPlatform; error: string }> = [];

    for (let i = 0; i < samples; i++) {
      const { results, errors } = await scanLLM({
        prompt,
        brandName,
        brandDomain,
        competitors,
        platforms,
        mode: typeof body.mode === 'string' ? body.mode : undefined,
      });
      failures.push(...errors.map((error) => ({ sample: i + 1, ...error })));
      for (const r of results) {
        const a = agg[r.platform] || (agg[r.platform] = { mentions: 0, positions: [], sentiments: [], citations: [], evidence: [] });
        if (r.brandMentioned) a.mentions++;
        if (r.mentionPosition != null) a.positions.push(r.mentionPosition);
        if (r.sentiment) a.sentiments.push(r.sentiment);
        if (Array.isArray(r.citations)) a.citations.push(...r.citations);
        a.evidence.push({
          sample: i + 1,
          sampleId: r.sampleId,
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

    let persistence: { status: 'stored' | 'failed' | 'not_applicable'; rows: number } = {
      status: 'not_applicable',
      rows: 0,
    };
    if (inserts.length) {
      const { error } = await admin.from('llm_scans').insert(inserts);
      if (error) {
        console.error('[v1/scan] failed to persist scans:', error);
        persistence = { status: 'failed', rows: 0 };
      } else {
        persistence = { status: 'stored', rows: inserts.length };
      }
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
    const succeededEngines = Object.keys(agg);
    const failedEngines = platforms.filter((platform) => !succeededEngines.includes(platform));
    const runStatus = succeededEngines.length === 0
      ? 'all_failed'
      : failures.length > 0
        ? 'partial'
        : 'complete';

    return {
      prompt,
      brandName,
      samples,
      visibility,
      engines,
      requestedEngines: platforms,
      succeededEngines,
      failedEngines,
      failures,
      runStatus,
      persistence,
      requestId,
      note: 'Each engine was asked the same question `samples` times. mentionRate and confidence reflect agreement across samples; evidence holds every raw pass so the number is defensible.',
    };
  }, { limitPerMinute: 10, bucket: 'scan' });
}
