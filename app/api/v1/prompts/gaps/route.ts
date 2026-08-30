import { withKey } from '@/lib/api-v1';
import { estimateMentionConfidence } from '@/lib/measurement/confidence';

// GET /api/v1/prompts/gaps?limit=15  — tracked buyer questions where your
// visibility is weakest, ranked by opportunity. (analyze_prompt_gaps)
export async function GET(request: Request) {
  const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 15));
  return withKey(request, 'read', async (ctx, admin) => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: prompts, error: promptsError }, { data: scans, error: scansError }] = await Promise.all([
      admin.from('prompt_library').select('id, prompt').eq('workspace_id', ctx.workspaceId),
      admin
        .from('llm_scans')
        .select('prompt, brand_mentioned')
        .eq('workspace_id', ctx.workspaceId)
        .gte('created_at', since),
    ]);

    if (promptsError || scansError) {
      throw new Error('Failed to fetch prompt gaps', { cause: promptsError || scansError });
    }

    const byPrompt: Record<string, { mentions: number; total: number }> = {};
    for (const s of scans || []) {
      const p = byPrompt[s.prompt] || (byPrompt[s.prompt] = { mentions: 0, total: 0 });
      p.total++;
      if (s.brand_mentioned) p.mentions++;
    }

    const gaps = (prompts || [])
      .map((p) => {
        const stat = byPrompt[p.prompt];
        const samples = stat ? stat.total : 0;
        const confidence = estimateMentionConfidence(stat?.mentions ?? 0, samples);
        const visibility = confidence.mentionRate === null ? null : Math.round(confidence.mentionRate * 100);
        return {
          id: p.id,
          prompt: p.prompt,
          visibility,
          samples,
          confidence: confidence.level,
          confidenceInterval: confidence.interval,
          status: samples === 0 ? 'unmeasured' : visibility! < 50 ? 'gap' : 'covered',
        };
      })
      .filter((g) => g.status !== 'covered')
      .sort((a, b) => (a.visibility ?? Number.POSITIVE_INFINITY) - (b.visibility ?? Number.POSITIVE_INFINITY))
      .slice(0, limit);

    return {
      note: 'Ranked by lowest 30-day visibility. "unmeasured" prompts have no scans yet. Confidence uses a 95% Wilson interval; this is a descriptive gap, not a change claim.',
      gaps,
    };
  });
}
