import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { assertProductionConvexTarget } from '../../lib/release/convex-target.mjs';
import { proxy } from '../../proxy';

const safeProduction = {
  VERCEL_ENV: 'production',
  AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT: 'laudable-orca-31',
  NEXT_PUBLIC_CONVEX_URL: 'https://laudable-orca-31.convex.cloud',
  NEXT_PUBLIC_CONVEX_SITE_URL: 'https://laudable-orca-31.convex.site',
  CONVEX_SERVER_KEY: 'synthetic-test-key',
};

test('Preview and local builds do not require a Production Convex target', () => {
  assert.doesNotThrow(() => assertProductionConvexTarget({ VERCEL_ENV: 'preview' }));
  assert.doesNotThrow(() => assertProductionConvexTarget({}));
  assert.doesNotThrow(() => assertProductionConvexTarget({ VERCEL_ENV: 'preview' }, 'aelo-rescue-preview.vercel.app'));
});

test('Production requires an explicit non-test Convex deployment', () => {
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT: '' }), /confirmed, non-test/);
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT: 'woozy-starfish-810' }), /confirmed, non-test/);
  assert.doesNotThrow(() => assertProductionConvexTarget(safeProduction));
});

test('the Next build configuration refuses a Production build aimed at Development', () => {
  const attempt = spawnSync(process.execPath, ['-e', "import('./next.config.mjs')"], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: {
      ...process.env,
      VERCEL_ENV: 'production',
      AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT: 'laudable-orca-31',
      NEXT_PUBLIC_CONVEX_URL: 'https://woozy-starfish-810.convex.cloud',
      NEXT_PUBLIC_CONVEX_SITE_URL: 'https://woozy-starfish-810.convex.site',
      CONVEX_SERVER_KEY: 'synthetic-test-key',
    },
    encoding: 'utf8',
  });
  assert.notEqual(attempt.status, 0);
  assert.match(attempt.stderr, /URLs must match the confirmed deployment/);
});

test('Production cloud and site URLs must both match the confirmed deployment', () => {
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, NEXT_PUBLIC_CONVEX_URL: 'https://woozy-starfish-810.convex.cloud' }), /URLs must match/);
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, NEXT_PUBLIC_CONVEX_SITE_URL: 'https://woozy-starfish-810.convex.site' }), /URLs must match/);
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, NEXT_PUBLIC_CONVEX_URL: 'http://laudable-orca-31.convex.cloud' }), /URLs must match/);
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, NEXT_PUBLIC_CONVEX_URL: 'https://laudable-orca-31.convex.cloud:8443' }), /URLs must match/);
});

test('a promoted Preview cannot serve a production hostname with a test backend', () => {
  const preview = { ...safeProduction, VERCEL_ENV: 'preview', AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT: '' };
  assert.throws(() => assertProductionConvexTarget(preview, 'aelohq.com'), /confirmed, non-test/);
  assert.throws(() => assertProductionConvexTarget(preview, 'aeo-nexus.vercel.app'), /confirmed, non-test/);
  assert.throws(() => assertProductionConvexTarget({ ...preview, VERCEL_PROJECT_PRODUCTION_URL: 'aelo.example.test' }, 'aelo.example.test'), /confirmed, non-test/);
  assert.doesNotThrow(() => assertProductionConvexTarget(safeProduction, 'aelohq.com'));
});

test('the request proxy returns 503 before routing a miswired production hostname', async () => {
  const names = ['VERCEL_ENV', 'VERCEL_TARGET_ENV', 'AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT',
    'NEXT_PUBLIC_CONVEX_URL', 'NEXT_PUBLIC_CONVEX_SITE_URL', 'CONVEX_SERVER_KEY'] as const;
  const previous = new Map(names.map(name => [name, process.env[name]] as const));
  try {
    Object.assign(process.env, {
      VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview',
      AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT: '',
      NEXT_PUBLIC_CONVEX_URL: 'https://woozy-starfish-810.convex.cloud',
      NEXT_PUBLIC_CONVEX_SITE_URL: 'https://woozy-starfish-810.convex.site',
      CONVEX_SERVER_KEY: 'synthetic-test-key',
    });
    const response = await proxy(new NextRequest('https://aelohq.com/api/v1/brands'));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'service_unavailable' });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    const previewResponse = await proxy(new NextRequest('https://aelo-rescue-preview.vercel.app/'));
    assert.equal(previewResponse.status, 200);
    assert.equal(previewResponse.headers.get('x-frame-options'), 'DENY');
  } finally {
    for (const name of names) {
      const value = previous.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('Production requires a real server key without exposing its value', () => {
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, CONVEX_SERVER_KEY: '' }), /matching Convex server key/);
  assert.throws(() => assertProductionConvexTarget({ ...safeProduction, CONVEX_SERVER_KEY: '[SENSITIVE]' }), /matching Convex server key/);
});
