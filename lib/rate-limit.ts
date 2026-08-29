import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { LRUCache } from 'lru-cache';

type RateLimiterOptions = {
    uniqueTokenPerInterval?: number;
    interval?: number;
    namespace: string;
};

export class RateLimitExceededError extends Error {
    constructor(public readonly retryAfterSeconds: number) {
        super('Rate limit exceeded.');
        this.name = 'RateLimitExceededError';
    }
}

export class RateLimitUnavailableError extends Error {
    constructor(message = 'Shared rate limiting is unavailable.') {
        super(message);
        this.name = 'RateLimitUnavailableError';
    }
}

export function isRateLimitUnavailableError(error: unknown): error is RateLimitUnavailableError {
    return error instanceof RateLimitUnavailableError;
}

export default function rateLimit(options: RateLimiterOptions) {
    const interval = options.interval ?? 60_000;
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    const hasSharedStore = Boolean(url && token);
    const productionWithoutSharedStore = process.env.NODE_ENV === 'production' && !hasSharedStore;
    const memory = new LRUCache<string, number>({
        max: options.uniqueTokenPerInterval ?? 500,
        ttl: interval,
    });
    const distributedByLimit = new Map<number, Ratelimit>();

    function distributed(limit: number): Ratelimit {
        const cached = distributedByLimit.get(limit);
        if (cached) return cached;
        const limiter = new Ratelimit({
            redis: new Redis({ url: url!, token: token! }),
            limiter: Ratelimit.fixedWindow(limit, `${interval} ms` as Duration),
            prefix: `aelo:ratelimit:${options.namespace}`,
            analytics: false,
            timeout: 5_000,
        });
        distributedByLimit.set(limit, limiter);
        return limiter;
    }

    return {
        /** `memory-local-only` never provides cross-instance protection. */
        mode: hasSharedStore ? 'upstash-shared' as const : 'memory-local-only' as const,
        async check(limit: number, identifier: string): Promise<void> {
            if (!Number.isSafeInteger(limit) || limit < 1 || !identifier) {
                throw new TypeError('Rate limit and identifier must be valid.');
            }
            if (productionWithoutSharedStore) {
                throw new RateLimitUnavailableError('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production.');
            }

            if (hasSharedStore) {
                try {
                    const result = await distributed(limit).limit(identifier);
                    if (!result.success) {
                        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1_000));
                        throw new RateLimitExceededError(retryAfter);
                    }
                    return;
                } catch (error) {
                    if (error instanceof RateLimitExceededError) throw error;
                    throw new RateLimitUnavailableError();
                }
            }

            const currentUsage = (memory.get(identifier) ?? 0) + 1;
            memory.set(identifier, currentUsage);
            if (currentUsage > limit) {
                throw new RateLimitExceededError(Math.ceil(interval / 1_000));
            }
        },
    };
}
