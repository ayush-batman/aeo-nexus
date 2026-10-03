import 'server-only';
import { getFunctionName, type FunctionArgs, type FunctionReference, type FunctionReturnType } from 'convex/server';

/** Server-only compatibility edge. Internal functions must still validate the
 * API-key/workspace binding or the verified provider event they receive. */
export async function callInternal<F extends FunctionReference<'query' | 'mutation' | 'action', 'internal'>>(
  kind: F['_type'], fn: F, args: FunctionArgs<F>,
): Promise<FunctionReturnType<F>> {
  const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const credential = process.env.CONVEX_SERVER_KEY;
  if (!deploymentUrl || !credential) throw new Error('convex_server_not_configured');
  const url = new URL(deploymentUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('invalid_convex_server_url');
  }
  const response = await fetch(new URL(`/api/${kind}`, url), {
    method: 'POST', headers: { Authorization: `Convex ${credential}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: getFunctionName(fn), args, format: 'json' }), cache: 'no-store',
    signal: AbortSignal.timeout(kind === 'action' ? 240_000 : 15_000),
  });
  if (!response.ok) throw new Error('convex_server_unavailable');
  const result = await response.json();
  if (result.status !== 'success') {
    // Never echo provider payloads, customer content, or credentials to callers.
    const safeCode = String(result.errorMessage ?? '').match(/(?:api_key_invalid|api_scope_denied|forbidden_role|engine_not_entitled|workspace_not_found|invalid_[a-z_]+|scan_quota_exceeded|request_id_conflict|rate_limit_exceeded|no_engines_available)/)?.[0];
    throw new Error(safeCode || 'convex_operation_failed');
  }
  return result.value;
}
