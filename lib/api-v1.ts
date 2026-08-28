import { NextResponse } from 'next/server';
import { resolveApiKey, hasScope, type ApiKeyContext } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Guard for /api/v1/* endpoints that back the Aelo MCP server.
 * Authenticates the Bearer API key, checks scope, hands the handler a
 * workspace-scoped admin client (the key already authorised the workspace),
 * and turns thrown errors into clean JSON.
 */
export async function withKey(
  request: Request,
  scope: 'read' | 'measure' | null,
  handler: (ctx: ApiKeyContext, admin: AdminClient) => Promise<unknown>,
): Promise<NextResponse> {
  const ctx = await resolveApiKey(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }
  if (scope && !hasScope(ctx, scope)) {
    return NextResponse.json({ error: `This API key lacks the '${scope}' scope` }, { status: 403 });
  }
  try {
    const data = await handler(ctx, createAdminClient());
    return NextResponse.json(data);
  } catch (e) {
    console.error('[api/v1] handler error:', e);
    return NextResponse.json({ error: (e as Error).message || 'Server error' }, { status: 500 });
  }
}

/** Look up the workspace's website + name (needed by scan/crawler tools). */
export async function getWorkspaceBrand(
  admin: AdminClient,
  workspaceId: string,
): Promise<{ name: string; website: string | null; competitors: string[] }> {
  const { data } = await admin
    .from('workspaces')
    .select('name, settings')
    .eq('id', workspaceId)
    .maybeSingle();
  const settings = (data?.settings || {}) as Record<string, unknown>;
  return {
    name: (data?.name as string) || '',
    website: (settings.website as string) || null,
    competitors: Array.isArray(settings.competitors) ? (settings.competitors as string[]) : [],
  };
}
