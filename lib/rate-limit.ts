import 'server-only';
import { createHash } from 'node:crypto';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
import { sharedRateLimit, type RateLimiterOptions } from './rate-limit-core';
export { RateLimitExceededError, RateLimitUnavailableError, isRateLimitUnavailableError } from './rate-limit-core';

export default function rateLimit(options: RateLimiterOptions) {
  return sharedRateLimit((limit, identifier) => callInternal('mutation', internal.abuse.check, {
    namespace: options.namespace, key: createHash('sha256').update(identifier).digest('hex'),
    limit, interval: options.interval ?? 60000,
  }));
}
