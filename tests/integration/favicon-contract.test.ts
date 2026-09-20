import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const missing = async (path: string) => {
  try {
    await access(path);
    return false;
  } catch {
    return true;
  }
};

test('the current brand favicon is the only browser icon source', async () => {
  assert.equal(await missing('app/favicon.ico'), true, 'legacy convention favicon must stay removed');
  const layout = await readFile('app/layout.tsx', 'utf8');
  const favicon = await readFile('public/brand/favicon.svg', 'utf8');

  assert.match(layout, /url:\s*["']\/brand\/favicon\.svg["']/);
  assert.match(favicon, /stroke="#E5D3A6"/);
  assert.match(favicon, />a<\/text>/);
});
