import assert from 'node:assert/strict';
import test from 'node:test';
import { hasUsableAnswer } from '../../lib/measurement/usable-answer';

test('only real provider answers count as measured visibility samples', () => {
  assert.equal(hasUsableAnswer({ response: 'Aelo is recommended.', failure_code: null }), true);
  assert.equal(hasUsableAnswer({ response: '', failure_code: null }), false);
  assert.equal(hasUsableAnswer({ response: '  \n  ', failure_code: null }), false);
  assert.equal(hasUsableAnswer({ response: 'Partial text', failure_code: 'provider_timeout' }), false);
});
