import { getAvailablePlatforms, type LLMPlatform } from '@/lib/ai/llm-scanner';
import { ApiV1Error, withKey } from '@/lib/api-v1';
import { getEntitlements } from '@/lib/entitlements';

// POST /api/v1/scans/schedule  — schedule a recurring multi-sample scan.
// Measurement only: spends no credits on anyone's behalf. (schedule_scan)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return withKey(request, 'measure', async (ctx, admin) => {
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 2_000) {
      throw new ApiV1Error(400, 'invalid_prompt', 'prompt is required and must be 2,000 characters or fewer');
    }
    const freq = ['daily', 'weekly', 'monthly'].includes(String(body.frequency))
      ? String(body.frequency)
      : 'weekly';
    const available = getAvailablePlatforms()
      .filter((engine) => engine.available)
      .map((engine) => engine.platform);
    const entitlements = await getEntitlements(ctx.orgId, admin);
    const entitledAndAvailable = available.filter((engine) => entitlements.engines.includes(engine));
    const requested = Array.isArray(body.platforms)
      ? [...new Set(body.platforms.map(String))]
      : [];
    const platforms = (requested.length ? requested : entitledAndAvailable)
      .filter((engine): engine is LLMPlatform => entitledAndAvailable.includes(engine as LLMPlatform));

    if (requested.some((engine) => !platforms.includes(engine as LLMPlatform))) {
      throw new ApiV1Error(403, 'engine_not_entitled', 'One or more requested engines are unavailable or not included in this plan.');
    }
    if (platforms.length === 0) {
      throw new ApiV1Error(503, 'no_engines_available', 'No entitled engines are currently configured.');
    }
    const competitors = Array.isArray(body.competitors)
      ? (body.competitors as unknown[]).slice(0, 20).map(String).map((value) => value.trim()).filter(Boolean)
      : [];

    const { data, error } = await admin
      .from('scheduled_scans')
      .insert({
        workspace_id: ctx.workspaceId,
        prompt,
        platforms,
        competitors,
        frequency: freq,
        next_run_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();
    if (error) throw new Error('Failed to schedule scan');
    return { scheduled: data };
  });
}
