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
  assert.match(preview, /The Gemini sample failed/);
  assert.match(preview, /The Gemini sample is still running/);
  assert.match(preview, /Not measured yet/);
  assert.match(preview, /Unavailable from one answer/);
  assert.match(preview, /Unavailable without a successful answer/);
  assert.match(preview, /instead of inventing a range/);
  assert.match(preview, /provenance === "provider_citation"/);
  assert.doesNotMatch(preview, /\b\d{1,3}%\b/);
});

test('public scan rejects an invalid idempotency key before calling the scan backend', async () => {
  const route = await readFile(new URL('../../app/api/scan/public/route.ts', import.meta.url), 'utf8');
  assert.match(route, /if \(!\/\^\[a-f0-9-\]\{36\}\$\/i\.test\(requestId\)\) return NextResponse\.json\(\{ error: 'invalid_public_scan' \}, \{ status: 400 \}\)/);
  assert.match(route, /id: requestId/);
});
