import { withKey } from '@/lib/api-v1';

// GET /api/v1/prompts/gaps?limit=15  — tracked buyer questions where your
// visibility is weakest, ranked by opportunity. (analyze_prompt_gaps)
export async function GET(request: Request) {
  const limit = Math.min(50, Math.max(1, Number(new URL(request.url).searchParams.get('limit')) || 15));
  return withKey(request, 'read', async (ctx, admin) => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: prompts }, { data: scans }] = await Promise.all([
      admin.from('prompt_library').select('id, prompt').eq('workspace_id', ctx.workspaceId),
      admin
        .from('llm_scans')
        .select('prompt, brand_mentioned')
        .eq('workspace_id', ctx.workspaceId)
        .gte('created_at', since),
    ]);

    const byPrompt: Record<string, { mentions: number; total: number }> = {};
    for (const s of scans || []) {
      const p = byPrompt[s.prompt] || (byPrompt[s.prompt] = { mentions: 0, total: 0 });
      p.total++;
      if (s.brand_mentioned) p.mentions++;
    }

    const gaps = (prompts || [])
      .map((p) => {
        const stat = byPrompt[p.prompt];
        const visibility = stat && stat.total ? Math.round((stat.mentions / stat.total) * 100) : 0;
        const samples = stat ? stat.total : 0;
        return { id: p.id, prompt: p.prompt, visibility, samples, status: samples === 0 ? 'unmeasured' : visibility < 50 ? 'gap' : 'covered' };
      })
      .filter((g) => g.status !== 'covered')
      .sort((a, b) => a.visibility - b.visibility)
      .slice(0, limit);

    return {
      note: 'Ranked by lowest current visibility. "unmeasured" prompts have no scans yet, run one to confirm the gap.',
      gaps,
    };
  });
}
