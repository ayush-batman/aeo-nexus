import assert from 'node:assert/strict';
import test from 'node:test';

import { prepareLegacyAuthUsers } from '../../scripts/convex/prepare-legacy-auth';

const now = Date.parse('2026-09-28T00:00:00Z');
const app = (publicId: string, email: string) => ({
  publicId, email, fullName: 'Test User', createdAt: 100, updatedAt: 200,
});
const auth = (id: string, email: string, verified = true) => ({
  id, email, email_confirmed_at: verified ? '2026-01-01T00:00:00Z' : null,
});

test('seeds only verified matched email owners, never passwords or provider accounts', () => {
  const result = prepareLegacyAuthUsers(
    [app('a', 'Owner@Example.com'), app('b', 'unverified@example.com')],
    [auth('a', 'owner@example.com'), auth('b', 'unverified@example.com', false), auth('c', 'auth-only@example.com')],
    now,
  );
  assert.deepEqual(result, {
    users: [{ name: 'Test User', email: 'owner@example.com', emailVerified: true, createdAt: 100, updatedAt: 200 }],
    skippedUnverified: 1,
    skippedAuthOnly: 1,
  });
  assert.equal('password' in result.users[0], false);
});

test('does not treat phone confirmation or banned identity as verified email access', () => {
  const phoneOnly = { ...auth('a', 'a@example.com', false), confirmed_at: '2026-01-01T00:00:00Z' };
  const banned = { ...auth('b', 'b@example.com'), banned_until: '2027-01-01T00:00:00Z' };
  const result = prepareLegacyAuthUsers([app('a', 'a@example.com'), app('b', 'b@example.com')], [phoneOnly, banned], now);
  assert.equal(result.users.length, 0);
  assert.equal(result.skippedUnverified, 2);
  assert.equal(prepareLegacyAuthUsers([app('a', 'a@example.com')], [{ ...auth('a', 'a@example.com'),
    email_confirmed_at: 'invalid' }], now).users.length, 0);
});

test('preserves a usable timestamp when the legacy user has no updatedAt field', () => {
  const legacy = { publicId: 'a', email: 'a@example.com', fullName: null, createdAt: 100 };
  const result = prepareLegacyAuthUsers([legacy], [auth('a', 'a@example.com')], now);
  assert.deepEqual(result.users, [{
    name: 'a', email: 'a@example.com', emailVerified: true, createdAt: 100, updatedAt: 100,
  }]);
});

test('rejects duplicate emails and app users without a matching source identity', () => {
  assert.throws(() => prepareLegacyAuthUsers([app('a', 'x@example.com'), app('b', 'X@example.com')], [], now), /duplicate_app_email/);
  assert.throws(() => prepareLegacyAuthUsers([app('a', 'x@example.com')], [auth('1', 'x@example.com'), auth('2', 'X@example.com')], now), /duplicate_auth_email/);
  assert.throws(() => prepareLegacyAuthUsers([app('a', 'x@example.com')], [auth('other', 'x@example.com')], now), /legacy_auth_id_mismatch/);
  assert.throws(() => prepareLegacyAuthUsers([app('a', 'x@example.com')], [], now), /app_user_without_auth_identity/);
});
