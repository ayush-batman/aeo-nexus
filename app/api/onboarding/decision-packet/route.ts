import { NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { fetchAuthMutation } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import { convexRouteError } from '@/lib/convex/http';
import { loadDecisionPacket } from '@/lib/convex/decision-packet';
export async function GET(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(await loadDecisionPacket(context.workspaceId, new URL(request.url).searchParams.get('id') || undefined));
  } catch (error) { return convexRouteError(error); }
}
export async function POST(request: Request) {
  try {
    const context = await getConvexWorkspaceContext();
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.prompts) || body.prompts.some((prompt: unknown) => typeof prompt !== 'string')) return NextResponse.json({ error: 'Choose 3 to 5 buyer prompts.' }, { status: 400 });
    const requestId = request.headers.get('idempotency-key') || crypto.randomUUID();
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return NextResponse.json({ error: 'Invalid request identifier.' }, { status: 400 });
    const packetId = await fetchAuthMutation(api.activation.begin, { workspaceId: context.workspaceId, prompts: body.prompts, requestId });
    const result = await loadDecisionPacket(context.workspaceId, packetId);
    return NextResponse.json({ ...result, statusUrl: `/api/onboarding/decision-packet?id=${packetId}` }, { status: result.pending ? 202 : 200 });
  } catch (error) { return convexRouteError(error); }
}
