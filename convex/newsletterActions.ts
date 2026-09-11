'use node';
import { createHash, randomBytes } from 'node:crypto';
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
export const subscribe = internalAction({
  args: { email: v.string(), source: v.union(v.string(), v.null()), ip: v.string() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const allowed = await ctx.runMutation(internal.abuse.check, { namespace: 'newsletter', key: createHash('sha256').update(args.ip).digest('hex'), limit: 5, interval: 3600000 });
    if (!allowed.ok) throw new Error('rate_limit_exceeded');
    await ctx.runMutation(internal.newsletter.subscribe, { email: args.email, source: args.source,
      unsubscribeTokenHash: createHash('sha256').update(randomBytes(32)).digest('hex') });
    return null;
  },
});
