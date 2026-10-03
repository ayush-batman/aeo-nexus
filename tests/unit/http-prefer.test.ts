import assert from 'node:assert/strict';
import test from 'node:test';
import { prefersRespondAsync } from '../../lib/http-prefer';

test('recognizes respond-async among multiple Prefer values', () => {
  const headers = new Headers({ Prefer: 'wait=10, RESPOND-ASYNC' });
  assert.equal(prefersRespondAsync(headers), true);
});

test('does not mistake an unrelated preference for respond-async', () => {
  const headers = new Headers({ Prefer: 'wait=10' });
  assert.equal(prefersRespondAsync(headers), false);
  assert.equal(prefersRespondAsync(new Headers()), false);
});
