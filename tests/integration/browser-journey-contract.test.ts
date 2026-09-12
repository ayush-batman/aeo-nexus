import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('package exposes a repeatable public browser journey', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const script = await readFile(
    new URL('../../scripts/e2e/public-journeys.mjs', import.meta.url),
    'utf8',
  );

  assert.equal(packageJson.scripts?.['test:e2e'], 'node scripts/e2e/public-journeys.mjs');
  for (const path of [
    '/',
    '/product',
    '/pricing',
    '/methodology',
    '/about',
    '/solutions/founders',
    '/solutions/marketing',
    '/solutions/agencies',
    '/solutions/india',
  ]) {
    assert.match(script, new RegExp(`['\"]${path.replaceAll('/', '\\/')}['\"]`));
  }
  assert.match(script, /1440[\s\S]*1000/);
  assert.match(script, /390[\s\S]*844/);
  assert.match(script, /scrollWidth > innerWidth/);
  assert.match(script, /pageerror/);
  assert.match(script, /requestfailed/);
  assert.match(script, /prefers-reduced-motion/);
});

test('browser smoke covers every primary signed-in job at desktop and mobile widths', async () => {
  const script = await readFile(new URL('../../scripts/convex/browser-smoke.mjs', import.meta.url), 'utf8');

  for (const path of [
    '/dashboard',
    '/dashboard/llm-tracker',
    '/dashboard/sources',
    '/dashboard/interventions',
    '/dashboard/report',
    '/dashboard/settings',
  ]) {
    assert.match(script, new RegExp(path.replaceAll('/', '\\/')));
  }
  assert.match(script, /AELO_TEST_CORE_JOBS/);
  assert.match(script, /1440[\s\S]*1000/);
  assert.match(script, /390[\s\S]*844/);
  assert.match(script, /scrollWidth > innerWidth/);
  assert.match(script, /sameOriginFailures/);
  assert.match(script, /usableMs/);
  assert.match(script, /No provider citations measured yet/);
  assert.match(script, /No actions in this stage/);
  assert.match(script, /AELO_LOCAL_TEST_AUTH_COOKIES/);
  assert.match(script, /Browser smoke is local-only/);
  assert.match(script, /Synthetic session cookies require local HTTPS/);
  assert.match(script, /AELO_EXPECT_MISSING_PROVIDERS/);
  assert.match(script, /AELO_ALLOW_TEST_MEASUREMENT/);
  assert.match(script, /AELO_TEST_ACCESSIBILITY/);
  assert.match(script, /Skip to dashboard content/);
  assert.match(script, /drawer did not return focus to its trigger/);
  assert.match(script, /width: 720, height: 500/);
  assert.match(script, /Add my brand/);
  assert.match(script, /Brand or company name/);
  assert.doesNotMatch(script, /Get Started|Brand\/Company Name/);
});
