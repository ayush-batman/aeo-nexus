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
  const touchIcon = await readFile('public/brand/social-square.svg', 'utf8');

  assert.match(layout, /url:\s*["']\/brand\/favicon\.svg\?v=20260926-arrow["']/);
  assert.match(favicon, /M62 18H84V40M84 18 60 42/);
  assert.match(touchIcon, /M62 18H84V40M84 18 60 42/);
  assert.doesNotMatch(favicon, /<ellipse\b|<text\b/);
  assert.doesNotMatch(touchIcon, /<ellipse\b|<text\b/);
});
