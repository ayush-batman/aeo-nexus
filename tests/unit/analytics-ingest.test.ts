import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createAnalyticsIngestToken,
  normalizeAnalyticsEvent,
  readBoundedJson,
  verifyAnalyticsIngestToken,
} from '../../lib/analytics-ingest';

const WORKSPACE_ID = '123e4567-e89b-42d3-a456-426614174000';

test('analytics tokens are signed for one workspace and reject tampering', () => {
  const mutableEnv = process.env as Record<string, string | undefined>;
  const original = mutableEnv.ANALYTICS_INGEST_SECRET;
  mutableEnv.ANALYTICS_INGEST_SECRET = 'test-only-secret-that-is-at-least-32-characters';
  try {
    const token = createAnalyticsIngestToken(WORKSPACE_ID);
    assert.equal(verifyAnalyticsIngestToken(WORKSPACE_ID, token), true);
    assert.equal(verifyAnalyticsIngestToken('223e4567-e89b-42d3-a456-426614174000', token), false);
    assert.equal(verifyAnalyticsIngestToken(WORKSPACE_ID, `${token}x`), false);
  } finally {
    if (original === undefined) delete mutableEnv.ANALYTICS_INGEST_SECRET;
    else mutableEnv.ANALYTICS_INGEST_SECRET = original;
  }
});

test('analytics event schema bounds names, URLs, paths, sources, and metadata', () => {
  const event = normalizeAnalyticsEvent({
    workspace_id: WORKSPACE_ID,
    event_type: 'signup.completed',
    referrer: 'https://chatgpt.com/',
    path: '/pricing?plan=pro',
    metadata: { plan: 'pro', value: 49 },
  });
  assert.equal(event.ai_source, 'chatgpt');
  assert.throws(() => normalizeAnalyticsEvent({ workspace_id: WORKSPACE_ID, event_type: '<script>' }));
  assert.throws(() => normalizeAnalyticsEvent({ workspace_id: WORKSPACE_ID, event_type: 'pageview', path: 'x'.repeat(3_000) }));
  assert.throws(() => normalizeAnalyticsEvent({ workspace_id: WORKSPACE_ID, event_type: 'pageview', metadata: { payload: 'x'.repeat(5_000) } }));
});

test('analytics request bodies stop at the byte limit', async () => {
  const request = new Request('https://aelohq.com/api/analytics/track', {
    method: 'POST',
    body: JSON.stringify({ payload: 'x'.repeat(20_000) }),
  });
  await assert.rejects(
    readBoundedJson(request, 16_384),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 413,
  );
});

test('analytics route requires token, bounded parsing, and shared rate limits', async () => {
const [route, backend, helper] = await Promise.all([
  readFile(new URL('../../app/api/analytics/track/route.ts', import.meta.url),'utf8'),
  readFile(new URL('../../convex/trafficActions.ts', import.meta.url),'utf8'),
  readFile(new URL('../../lib/analytics-ingest.ts', import.meta.url),'utf8')]);
 assert.match(route,/readBoundedJson/); assert.match(route,/internal\.trafficActions\.ingest/);
 assert.match(backend,/verifyAnalyticsIngestToken/); assert.match(backend,/internal\.abuse\.check/);
 assert.match(helper,/AnalyticsInputError\('Request body is too large\.', 413\)/);
 assert.doesNotMatch(route,/request\.json\(\)/);
});
