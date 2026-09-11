import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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
});
