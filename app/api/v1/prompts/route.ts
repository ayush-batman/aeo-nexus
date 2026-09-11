import { ApiV1Error, withKey } from '@/lib/api-v1';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';

export async function GET(request: Request) {
  return withKey(request, 'read', async (_context, reader) => ({ prompts: await reader.prompts() }));
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return withKey(request, 'measure', async (context) => {
    if (typeof body?.prompt !== 'string') throw new ApiV1Error(400, 'invalid_prompt', 'Provide a buyer question.');
    return { tracked: await callInternal('mutation', internal.apiWrites.trackPrompt, { keyId: context.keyId, prompt: body.prompt }) };
  });
}
