import { ApiV1Error, withKey } from '@/lib/api-v1';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return withKey(request, 'measure', async (context) => {
    const engines = ['gemini', 'chatgpt', 'claude', 'perplexity'] as const;
    if (typeof body?.prompt !== 'string' ||
        (body.platforms !== undefined && (!Array.isArray(body.platforms) || body.platforms.some((value: unknown) => !engines.some((engine) => engine === value)))) ||
        (body.competitors !== undefined && (!Array.isArray(body.competitors) || body.competitors.some((value: unknown) => typeof value !== 'string')))) {
      throw new ApiV1Error(400, 'invalid_schedule', 'Check the prompt, engines and competitors.');
    }
    const frequency = body.frequency === 'daily' ? 'daily' : body.frequency === 'monthly' ? 'monthly' : 'weekly';
    const platforms = body.platforms === undefined ? undefined : engines.filter((engine) => body.platforms.includes(engine));
    return { scheduled: await callInternal('mutation', internal.apiWrites.schedule, {
      keyId: context.keyId, prompt: body.prompt, platforms, competitors: body.competitors ?? [], frequency,
    }) };
  });
}
