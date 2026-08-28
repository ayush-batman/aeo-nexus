import { withKey } from '@/lib/api-v1';

// GET /api/v1/prompts  — buyer questions currently tracked. (list_prompts)
export async function GET(request: Request) {
  return withKey(request, 'read', async (ctx, admin) => {
    const { data } = await admin
      .from('prompt_library')
      .select('id, prompt, category, is_favorite, created_at')
      .eq('workspace_id', ctx.workspaceId)
      .order('created_at', { ascending: false });
    return { prompts: data || [] };
  });
}

// POST /api/v1/prompts  — start MEASURING a buyer question. (track_prompt)
// Measurement only: adds the prompt to the library, posts nothing.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'measure', async (ctx, admin) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) throw new Error('prompt is required');
    const { data, error } = await admin
      .from('prompt_library')
      .insert({ workspace_id: ctx.workspaceId, prompt, category: 'General', ai_generated: false })
      .select('id, prompt, category, created_at')
      .single();
    if (error) throw new Error('Failed to track prompt');
    return { tracked: data };
  });
}
