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

  assert.match(layout, /url:\s*["']\/brand\/favicon\.svg\?v=20260926-arrow["']/);
  assert.match(favicon, /stroke="#A8CBE0"/);
  assert.match(favicon, /reference arrow/);
  assert.match(favicon, /<path d="M444\.7 -30/);
  assert.match(favicon, /M62 18H84V40M84 18 60 42/);
  assert.doesNotMatch(favicon, /<ellipse\b/, 'old halo mark must not return');
  assert.doesNotMatch(favicon, /<text\b/, 'favicon must not depend on a browser font fallback');
});

test('shared logo and downloadable brand assets use the same arrow identity', async () => {
  const logo = await readFile('components/brand/logo.tsx', 'utf8');
  const brandPage = await readFile('app/(marketing)/brand/page.tsx', 'utf8');
  const welcomeEmail = await readFile('components/emails/WelcomeEmail.tsx', 'utf8');
  assert.match(logo, /M62 18H84V40M84 18 60 42/);
  assert.match(logo, /↗/);
  assert.doesNotMatch(logo, /<ellipse\b/);
  assert.doesNotMatch(brandPage, /halo/i);
  assert.doesNotMatch(brandPage, /Inter|JetBrains Mono/);
  assert.doesNotMatch(welcomeEmail, /logo\.png/);

  for (const name of [
    'mark.svg', 'mark-mono-white.svg', 'mark-mono-black.svg',
    'wordmark.svg', 'wordmark-mono-white.svg', 'wordmark-mono-black.svg',
    'social-square.svg', 'instagram-square.svg', 'linkedin-banner.svg',
    'x-banner.svg', 'twitter-banner.svg', 'meta-banner.svg',
  ]) {
    const asset = await readFile(`public/brand/${name}`, 'utf8');
    assert.doesNotMatch(asset, /<ellipse\b/, `${name} still contains the old halo`);
    assert.match(asset, /<path\b/, `${name} is missing its reference arrow`);
  }
});
