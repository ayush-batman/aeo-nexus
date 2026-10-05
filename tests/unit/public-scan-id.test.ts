import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicScanId } from '../../lib/public-scan-id';

test('public scan ids must be UUID-shaped', () => {
  assert.equal(isPublicScanId('4f7f2c8e-6b36-4ee4-86ce-dbe6d7c7a926'), true);
  assert.equal(isPublicScanId('4F7F2C8E-6B36-4EE4-86CE-DBE6D7C7A926'), true);
  for (const value of ['-'.repeat(36), 'a'.repeat(36), '4f7f2c8e6b364ee486cedbe6d7c7a926----', '']) {
    assert.equal(isPublicScanId(value), false, value);
  }
});
