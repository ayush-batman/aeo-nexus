import { createHash, randomBytes } from 'crypto';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { type WorkspaceRole } from '@/lib/authorization';

export interface ApiKeyContext {
  workspaceId: string;
  orgId: string;
  userId: string;
  keyId: string;
  scopes: string[];
  role: WorkspaceRole;
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
  if (!secret || secret.length > 256 || !secret.startsWith('alo_live_')) return null;

  return callInternal('query', internal.apiKeys.resolveHash, { hash: hashKey(secret) });
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
