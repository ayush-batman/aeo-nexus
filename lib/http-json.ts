import { NextResponse } from 'next/server';

/** Preserve the JSON contract while avoiding a single buffered multi-MiB body.
 * Hosting must support streamed responses; validate this in staging before cutover.
 */
export function evidenceJson(value: unknown, init?: ResponseInit): NextResponse {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.byteLength < 3 * 1024 * 1024) return NextResponse.json(value, init);
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) { controller.close(); return; }
      const end = Math.min(offset + 64 * 1024, bytes.byteLength);
      controller.enqueue(bytes.subarray(offset, end));
      offset = end;
    },
  });
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'private, no-store');
  headers.delete('Content-Length');
  return new NextResponse(stream, { ...init, headers });
}
