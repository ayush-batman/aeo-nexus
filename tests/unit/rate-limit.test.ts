import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import rateLimit, { RateLimitExceededError, RateLimitUnavailableError } from '../../lib/rate-limit';

test('local fallback permits the declared limit and rejects the next request', async () => {
  const limiter = rateLimit({ interval: 60_000, namespace: 'test-boundary' });
  await limiter.check(3, 'one-user');
  await limiter.check(3, 'one-user');
  await limiter.check(3, 'one-user');
  await assert.rejects(limiter.check(3, 'one-user'), RateLimitExceededError);
});

test('production fails closed when shared Redis credentials are absent', async () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  mutableEnv.NODE_ENV = 'production';
  delete mutableEnv.UPSTASH_REDIS_REST_URL;
  delete mutableEnv.UPSTASH_REDIS_REST_TOKEN;
  try {
    const limiter = rateLimit({ namespace: 'test-production-config' });
    await assert.rejects(limiter.check(1, 'one-user'), RateLimitUnavailableError);
  } finally {
    if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = originalNodeEnv;
    if (originalUrl === undefined) delete mutableEnv.UPSTASH_REDIS_REST_URL;
    else mutableEnv.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete mutableEnv.UPSTASH_REDIS_REST_TOKEN;
    else mutableEnv.UPSTASH_REDIS_REST_TOKEN = originalToken;
  }
});

test('rate limiter uses Upstash for shared production accounting', async () => {
  const source = await readFile(new URL('../../lib/rate-limit.ts', import.meta.url), 'utf8');
  assert.match(source, /@upstash\/ratelimit/);
  assert.match(source, /@upstash\/redis/);
  assert.match(source, /UPSTASH_REDIS_REST_URL/);
  assert.match(source, /UPSTASH_REDIS_REST_TOKEN/);
  assert.match(source, /NODE_ENV === 'production'/);
});
