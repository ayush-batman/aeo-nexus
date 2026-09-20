import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('methodology shows a complete real case without inventing causal movement', async () => {
  const source = await readFile(new URL('../../app/(marketing)/methodology/page.tsx', import.meta.url), 'utf8');

  for (const stage of ['Question', 'Findings', 'Gap', 'Action', 'Movement']) {
    assert.match(source, new RegExp(stage));
  }
  assert.match(source, /100 calls/);
  assert.match(source, /45%/);
  assert.match(source, /Blue Tokai Coffee Roasters/);
  assert.match(source, /invalid Gemini run was discarded/);
  assert.match(source, /no brand-improvement claim/i);
  assert.doesNotMatch(source, /Illustrative calculation/);
});
