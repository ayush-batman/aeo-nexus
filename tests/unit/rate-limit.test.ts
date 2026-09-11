import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { sharedRateLimit, RateLimitExceededError, RateLimitUnavailableError } from '../../lib/rate-limit-core';
test('shared limiter preserves the declared boundary and retry time', async () => {
  let calls = 0;
  const limiter = sharedRateLimit(async limit => ({ ok: ++calls <= limit, retryAfter: 30 }));
  await limiter.check(3, 'synthetic-user'); await limiter.check(3, 'synthetic-user'); await limiter.check(3, 'synthetic-user');
  await assert.rejects(limiter.check(3, 'synthetic-user'), error => error instanceof RateLimitExceededError && error.retryAfterSeconds === 30);
  assert.equal(calls, 4);
});
test('shared-store outages fail closed without a local fallback', async () => {
  const limiter = sharedRateLimit(async () => { throw new Error('unavailable'); });
  await assert.rejects(limiter.check(1, 'synthetic-user'), RateLimitUnavailableError);
  await assert.rejects(limiter.check(0, 'synthetic-user'), TypeError);
});
test('production limiter uses Convex atomic accounting, without Redis or process-local state', async () => {
  const source = await readFile(new URL('../../lib/rate-limit.ts', import.meta.url), 'utf8');
  assert.match(source, /internal\.abuse\.check/); assert.match(source, /createHash/);
  assert.doesNotMatch(source, /@upstash|LRUCache|new Map|NODE_ENV/);
});
