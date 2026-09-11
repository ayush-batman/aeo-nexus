import type { ActionCtx } from '../_generated/server';
import { internal } from '../_generated/api';

// Runs inside the existing HTTP action: no extra Node action or cold start.
// Keep the same SHA-256 key and namespace so an update cannot reset limits.
export async function consumeAuthLimit(ctx: Pick<ActionCtx, 'runMutation'>, args: { key: string; window: number; max: number }) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(args.key));
  const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const result = await ctx.runMutation(internal.abuse.check, {
    namespace: 'auth', key, limit: args.max, interval: args.window * 1000,
  });
  return { allowed: result.ok, retryAfter: result.ok ? null : result.retryAfter };
}
