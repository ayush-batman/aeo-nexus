import assert from 'node:assert/strict';
import test from 'node:test';

import { assertRole, roleAllows } from '../../convex/lib/rolePolicy';

test('tenant roles preserve the existing read and write hierarchy', () => {
  assert.equal(roleAllows('viewer', 'viewer'), true);
  assert.equal(roleAllows('viewer', 'editor'), false);
  assert.equal(roleAllows('editor', 'editor'), true);
  assert.equal(roleAllows('editor', 'admin'), false);
  assert.equal(roleAllows('admin', 'admin'), true);
  assert.equal(roleAllows('admin', 'owner'), false);
  assert.equal(roleAllows('owner', 'owner'), true);
});

test('role checks fail closed with a stable error code', () => {
  assert.throws(() => assertRole('viewer', 'editor'), /forbidden_role/);
  assert.doesNotThrow(() => assertRole('owner', 'editor'));
});
