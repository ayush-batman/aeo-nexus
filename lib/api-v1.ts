import { NextResponse } from 'next/server';
import { resolveApiKey, hasScope, type ApiKeyContext } from '@/lib/api-auth';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { apiReader, type ApiReader } from '@/lib/convex/api-reader';
import { evidenceJson } from './http-json';

interface WithKeyOptions { limitPerMinute?: number; bucket?: string; }
export class ApiV1Error extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message); this.name = 'ApiV1Error';
  }
}

/** Credentials resolve on the server; every backend operation independently
 * rechecks the key so revocation or membership changes take effect immediately. */
export async function withKey(request: Request, scope: 'read' | 'measure' | null,
  handler: (ctx: ApiKeyContext, reader: ApiReader) => Promise<unknown>, opts: WithKeyOptions = {}): Promise<NextResponse> {
  try {
    const context = await resolveApiKey(request);
    if (!context) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    if (scope && !hasScope(context, scope)) return NextResponse.json({ error: `This API key lacks the '${scope}' scope` }, { status: 403 });
    const decision = await callInternal('mutation', internal.apiReads.authorize, { keyId: context.keyId, scope,
      bucket: opts.bucket ?? 'read', limit: opts.limitPerMinute ?? 120 });
    if (!decision.ok) return NextResponse.json({ error: 'Rate limit exceeded. Slow down and retry shortly.' },
      { status: 429, headers: { 'Retry-After': String(decision.retryAfter) } });
    const result = await handler(context, apiReader(context));
    return result instanceof NextResponse ? result : evidenceJson(result);
  } catch (error) {
    if (error instanceof ApiV1Error) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    const message = error instanceof Error ? error.message : '';
    if (/api_key_invalid/.test(message)) return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 });
    if (/api_scope_denied|forbidden_role/.test(message)) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    if (/scan_quota_exceeded|rate_limit_exceeded/.test(message)) return NextResponse.json({ error: 'Scan limit reached' }, { status: 429, headers: { 'Retry-After': '60' } });
    if (/request_id_conflict/.test(message)) return NextResponse.json({ error: 'Request identifier already used', code: 'duplicate_scan_request' }, { status: 409 });
    if (/invalid_/.test(message)) return NextResponse.json({ error: 'Invalid request values' }, { status: 400 });
    return NextResponse.json({ error: 'The API is temporarily unavailable. Please retry.' }, { status: 503, headers: { 'Retry-After': '60' } });
  }
}

export async function getWorkspaceBrand(reader: ApiReader): Promise<{ name: string; website: string | null; competitors: string[] }> {
  const workspace = await reader.workspace();
  const settings = workspace.settings as Record<string, unknown>;
  return { name: workspace.name, website: typeof settings?.website === 'string' ? settings.website : null,
    competitors: Array.isArray(settings?.competitors) ? settings.competitors.filter((value): value is string => typeof value === 'string') : [] };
}
