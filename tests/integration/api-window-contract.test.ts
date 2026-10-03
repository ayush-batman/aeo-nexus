import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('versioned trend, citation, and competitor routes report canonical windows', async () => {
  for (const path of [
    'app/api/v1/visibility/trend/route.ts',
    'app/api/v1/citations/route.ts',
    'app/api/v1/competitors/route.ts',
  ]) {
    const source = await readFile(path, 'utf8');
    assert.match(source, /resolveApiWindow\(/, `${path} must normalize its reported window`);
    assert.match(source, /window: w/, `${path} must return the normalized window`);
  }
});
