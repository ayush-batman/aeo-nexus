import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ApiKeyContext {
  workspaceId: string;
  orgId: string;
  userId: string;
  keyId: string;
  scopes: string[];
}

/** sha256 hex of the presented secret; only the hash is ever stored. */
function hashKey(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

/**
 * Resolve a Bearer API key from a request into a workspace context.
 * Returns null when there is no key, the key is unknown, or it is revoked.
 *
 * Keys look like `alo_live_<random>`; we hash the whole thing and look it up.
 * Used by the /api/v1/* endpoints that back the Aelo MCP server.
 */
export async function resolveApiKey(request: Request): Promise<ApiKeyContext | null> {
  const auth = request.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const secret = m[1].trim();
  if (!secret) return null;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    // Without the service role we cannot authenticate programmatic keys.
    return null;
  }

  const { data, error } = await admin
    .from('api_keys')
    .select('id, workspace_id, org_id, created_by, scopes, revoked_at')
    .eq('key_hash', hashKey(secret))
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !data) return null;

  // Best-effort last-used stamp; never block the request on it.
  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(
    () => {},
    () => {},
  );

  return {
    workspaceId: data.workspace_id,
    orgId: data.org_id,
    userId: data.created_by,
    keyId: data.id,
    scopes: data.scopes || ['read'],
  };
}

/** True when the key is allowed a given scope ('read' | 'measure'). */
export function hasScope(ctx: ApiKeyContext, scope: string): boolean {
  return ctx.scopes.includes(scope);
}

/** Generate a new key secret + its storable parts. Call when issuing a key. */
export function generateApiKey(): { secret: string; prefix: string; hash: string } {
  const secret = `alo_live_${randomBytes(24).toString('hex')}`;
  return { secret, prefix: secret.slice(0, 12), hash: hashKey(secret) };
}
