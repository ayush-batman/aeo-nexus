import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Convex scripts and packages remain declared', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };

  assert.equal(
    pkg.scripts['convex:check'],
    'CONVEX_AGENT_MODE=anonymous convex dev --once',
  );

  for (const name of [
    'convex',
    '@convex-dev/better-auth',
    'better-auth',
    'convex-helpers',
    '@convex-dev/rate-limiter',
    '@convex-dev/workflow',
    '@convex-dev/workpool',
  ]) {
    assert.ok(pkg.dependencies[name], `${name} is required`);
  }
});

