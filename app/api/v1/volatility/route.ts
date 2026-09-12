import { withKey } from '@/lib/api-v1';
import { estimateMentionConfidence } from '@/lib/measurement/confidence';
import { mentionVolatilityPercent } from '@/lib/measurement/metrics';

// GET /api/v1/volatility?window=30d — mention-outcome uncertainty for repeated,
// compatible samples of the same question and engine. (get_answer_volatility)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const w = url.searchParams.get('window') === '7d' ? '7d' : '30d';
  const promptFilter = url.searchParams.get('promptId') || undefined;
  const days = w === '7d' ? 7 : 30;
  return withKey(request, 'read', async (ctx, admin) => {
    const prompts = promptFilter ? await admin.prompts() : [];
    const prompt = promptFilter ? prompts.find((row) => row.id === promptFilter)?.prompt ?? promptFilter : undefined;
    const data = await admin.scans({ since: Date.now() - days * 86400000, prompt });

    // group by (prompt, engine)
    const groups: Record<string, { prompt: string; engine: string; mentions: number; total: number }> = {};
    for (const r of data || []) {
      const metadata = [r.provider_model, r.measurement_region, r.measurement_mode, r.scorer_version,
        r.measurement_contract_version, r.search_mode, r.analyzer_method, r.analyzer_model, r.analyzer_prompt_version];
      if (metadata.some((value) => !value)) continue;
      const key = [r.prompt, r.platform, ...metadata].join('\u0000');
      const g = groups[key] || (groups[key] = { prompt: r.prompt, engine: r.platform, mentions: 0, total: 0 });
      g.total++;
      if (r.brand_mentioned) g.mentions++;
    }

    const items = Object.values(groups)
      .filter((g) => g.total >= 4)
      .map((g) => {
        const rate = g.mentions / g.total;
        const confidence = estimateMentionConfidence(g.mentions, g.total);
        const volatilityPct = mentionVolatilityPercent(g.mentions, g.total);
        if (volatilityPct === null) throw new Error('volatility_sample_count_invalid');
        return {
          prompt: g.prompt,
          engine: g.engine,
          samples: g.total,
          mentions: g.mentions,
          mentionRate: Math.round(rate * 100) / 100,
          volatilityPct,
          confidence: confidence.level,
          confidenceInterval: confidence.interval,
        };
      })
      .sort((a, b) => b.volatilityPct - a.volatilityPct);

    const avg = items.length ? Math.round(items.reduce((a, i) => a + i.volatilityPct, 0) / items.length) : null;
    return {
      window: w,
      avgVolatilityPct: avg,
      status: items.length ? 'measured' : 'inconclusive',
      metric: 'mention_split_volatility',
      note: 'Mention volatility describes only the balance of mentions and non-mentions within matching prompt, engine, model, search and scoring settings. It is not full-answer change or a chronological flip rate. 0 = all observed mention outcomes agree; 100 = evenly split. At least 4 compatible samples are required.',
      items,
    };
  });
}
