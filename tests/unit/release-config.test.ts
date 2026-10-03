import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectRoot = new URL('../../', import.meta.url);

test('the production build cannot ignore TypeScript errors', async () => {
  const config = await readFile(new URL('next.config.mjs', projectRoot), 'utf8');

  assert.doesNotMatch(config, /ignoreBuildErrors\s*:\s*true/);
});

test('the package exposes explicit rescue verification commands', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('package.json', projectRoot), 'utf8'),
  ) as { scripts?: Record<string, string> };

  assert.equal(packageJson.scripts?.lint, 'eslint app components hooks lib proxy.ts tests');
  assert.equal(packageJson.scripts?.typecheck, 'tsc --noEmit');
  assert.equal(
    packageJson.scripts?.['typecheck:mcp'],
    'tsc -p mcp-server/tsconfig.json --noEmit',
  );
});
