import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('onboarding exposes auto-filled business details for review before saving', async () => {
  const page = await readFile(new URL('../../app/(dashboard)/onboarding/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /id="onboarding-description"/);
  assert.match(page, /value=\{description\}/);
  assert.match(page, /onChange=\{\(event\) => setDescription\(event\.target\.value\)\}/);
  assert.match(page, /id="onboarding-audience"/);
  assert.match(page, /value=\{targetAudience\}/);
  assert.match(page, /onChange=\{\(event\) => setTargetAudience\(event\.target\.value\)\}/);
  assert.match(page, /These are AI suggestions based on website content, not verified facts/);
  assert.match(page, /body: JSON\.stringify\(\{\s*brandName,\s*website,\s*industry,\s*description,\s*targetAudience/);
});
