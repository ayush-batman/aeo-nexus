import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('public scan receipt previews Radar without presenting invented measurements', async () => {
  const [page, preview] = await Promise.all([
    readFile(new URL('../../app/(marketing)/scan/[id]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../components/marketing/radar-preview.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /<RadarPreview/);
  assert.match(preview, /The first Gemini answer below is real/);
  assert.match(preview, /Not measured yet/);
  assert.match(preview, /Unavailable from one answer/);
  assert.match(preview, /instead of inventing a range/);
  assert.match(preview, /provenance === "provider_citation"/);
  assert.doesNotMatch(preview, /\b\d{1,3}%\b/);
});
