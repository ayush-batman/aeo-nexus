import assert from 'node:assert/strict';
import test from 'node:test';
import { evidenceJson } from '../../lib/http-json';

test('large evidence stays byte-exact JSON across bounded stream chunks', async () => {
  const value = { response: 'Synthetic evidence 🧪'.repeat(220000), status: 'complete' };
  const response = evidenceJson(value);
  assert.equal(response.headers.get('content-length'), null);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const reader = response.body!.getReader(); const chunks: Uint8Array[] = [];
  for (;;) { const chunk = await reader.read(); if (chunk.done) break;
    assert.ok(chunk.value.byteLength <= 65536); chunks.push(chunk.value); }
  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), value);
});
