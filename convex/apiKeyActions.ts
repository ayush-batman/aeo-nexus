'use node';
import { createHash, randomBytes } from 'node:crypto';
import { v, type Infer } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

const keySummary = v.object({ id: v.string(), name: v.string(), key_prefix: v.string(), scopes: v.array(v.string()),
  last_used_at: v.union(v.string(), v.null()), created_at: v.string(), revoked_at: v.union(v.string(), v.null()) });
export const create = action({
  args: { workspaceId: v.string(), name: v.string(), scopes: v.array(v.union(v.literal('read'), v.literal('measure'))) },
  returns: v.object({ key: keySummary, secret: v.string() }),
  handler: async (ctx, args): Promise<{ key: Infer<typeof keySummary>; secret: string }> => {
    const secret = `alo_live_${randomBytes(24).toString('hex')}`;
    const key = await ctx.runMutation(internal.apiKeys.issue, { ...args,
      hash: createHash('sha256').update(secret).digest('hex'), prefix: secret.slice(0, 12) });
    return { key, secret };
  },
});
