export type RateLimiterOptions = { uniqueTokenPerInterval?: number; interval?: number; namespace: string };
export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) { super('Rate limit exceeded.'); this.name = 'RateLimitExceededError'; }
}
export class RateLimitUnavailableError extends Error {
  constructor(message = 'Shared rate limiting is unavailable.') { super(message); this.name = 'RateLimitUnavailableError'; }
}
export function isRateLimitUnavailableError(error: unknown): error is RateLimitUnavailableError { return error instanceof RateLimitUnavailableError; }
export function sharedRateLimit(consume: (limit: number, identifier: string) => Promise<{ ok: boolean; retryAfter: number }>) {
  return { mode: 'convex-shared' as const, async check(limit: number, identifier: string): Promise<void> {
    if (!Number.isSafeInteger(limit) || limit < 1 || !identifier) throw new TypeError('Rate limit and identifier must be valid.');
    try {
      const result = await consume(limit, identifier);
      if (!result.ok) throw new RateLimitExceededError(result.retryAfter);
    } catch (error) {
      if (error instanceof RateLimitExceededError) throw error;
      throw new RateLimitUnavailableError();
    }
  } };
}
