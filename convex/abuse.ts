import { v } from 'convex/values';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { components } from './_generated/api';
import { internalMutation } from './_generated/server';
export const check = internalMutation({
  args: { namespace: v.string(), key: v.string(), limit: v.number(), interval: v.number() },
  returns: v.object({ ok: v.boolean(), retryAfter: v.number() }),
  handler: async (ctx, args) => {
    if (!/^[a-z0-9:_-]{1,100}$/i.test(args.namespace) || args.key.length > 512 || !args.key ||
      !Number.isSafeInteger(args.limit) || args.limit < 1 || args.limit > 100000 || !Number.isSafeInteger(args.interval) || args.interval < 1000 || args.interval > 86400_000) throw new Error('invalid_rate_limit');
    const limits = new RateLimiter(components.rateLimiter, { [args.namespace]: { kind: 'fixed window', rate: args.limit, period: args.interval } });
    const result = await limits.limit(ctx, args.namespace, { key: args.key });
    return { ok: result.ok, retryAfter: result.ok ? 0 : Math.ceil((result.retryAfter ?? args.interval) / 1000) };
  },
});
