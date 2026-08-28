import { NextResponse } from 'next/server';
import { resolveApiKey, hasScope, type ApiKeyContext } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import rateLimit from '@/lib/rate-limit';

type AdminClient = ReturnType<typeof createAdminClient>;

// Per-key rate limiting (in-memory, per server instance, same primitive the
// signup route uses). Default is a generous read budget; expensive endpoints
// (a live multi-sample scan) pass a much lower limit via a separate bucket.
const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 5000 });
const DEFAULT_PER_MINUTE = 120;

interface WithKeyOptions {
  /** Requests per minute allowed for this call. Defaults to 120. */
  limitPerMinute?: number;
  /** Separate rate bucket name, so heavy endpoints don't share the read budget. */
  bucket?: string;
}

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
  opts: WithKeyOptions = {},
): Promise<NextResponse> {
  const ctx = await resolveApiKey(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }
  if (scope && !hasScope(ctx, scope)) {
    return NextResponse.json({ error: `This API key lacks the '${scope}' scope` }, { status: 403 });
  }

  const limit = opts.limitPerMinute ?? DEFAULT_PER_MINUTE;
  const token = opts.bucket ? `${ctx.keyId}:${opts.bucket}` : ctx.keyId;
  try {
    await limiter.check(limit, token);
  } catch {
    return NextResponse.json(
      { error: `Rate limit exceeded (${limit}/min). Slow down and retry shortly.` },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
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
