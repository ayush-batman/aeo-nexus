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

test('public receipt exposes the saved model and does not imply cited pages were checked', async () => {
  const page = await readFile(new URL('../../app/(marketing)/scan/[id]/page.tsx', import.meta.url), 'utf8');
  assert.match(page, /scan\.provider_model/);
  assert.match(page, /Model not recorded/);
  assert.match(page, /Page content and reachability have not been checked/);
  assert.match(page, /Provider citation means the assistant supplied this link/);
});

test('public scan rejects an invalid idempotency key before calling the scan backend', async () => {
  const route = await readFile(new URL('../../app/api/scan/public/route.ts', import.meta.url), 'utf8');
  assert.match(route, /if \(!\/\^\[a-f0-9-\]\{36\}\$\/i\.test\(requestId\)\) return NextResponse\.json\(\{ error: 'invalid_public_scan' \}, \{ status: 400 \}\)/);
  assert.match(route, /id: requestId/);
});

test('homepage free scan opts into immediate durable receipt navigation without changing other API callers', async () => {
  const [widget, route] = await Promise.all([
    readFile(new URL('../../components/marketing/free-scan-widget.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/scan/public/route.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(widget, /'Prefer': 'respond-async'/);
  assert.match(route, /if \(prefersRespondAsync\(request\.headers\)\)/);
  assert.ok(route.indexOf('if (prefersRespondAsync(request.headers))') < route.indexOf('do {'));
  assert.match(route, /status: 'queued', shareUrl: `\/scan\/\$\{result\.id\}`/);
  assert.match(route, /statusUrl: `\/api\/scan\/public\/\$\{result\.id\}`/);
  assert.match(widget, /router\.push\(shareUrl\)/);
});
