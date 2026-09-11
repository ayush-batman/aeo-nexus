// Local frontend only; synthetic account. Never print cookies or key material.
const origin = 'http://localhost:3000';
const email = process.env.AELO_LOCAL_TEST_EMAIL;
const password = process.env.AELO_LOCAL_TEST_PASSWORD;
if (!email?.endsWith('@example.test') || !password) throw new Error('Synthetic test credentials required');
const login = await fetch(`${origin}/api/auth/sign-in/email`, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000),
});
if (!login.ok) throw new Error(`Synthetic login failed: ${login.status}`);
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
if (!cookie) throw new Error('Synthetic login did not set a session');
const call = (path, options = {}) => fetch(`${origin}${path}`, {
  ...options, headers: { Cookie: cookie, Origin: origin, ...options.headers }, signal: AbortSignal.timeout(20000),
});
const missing = await call('/api/v1/brands');
const listed = await call('/api/keys');
if (!listed.ok) throw new Error(`Key lookup failed: ${listed.status}`);
for (const key of (await listed.json()).keys) {
  if (key.name === 'Synthetic browser verification' && !key.revoked_at) {
    const cleanup = await call(`/api/keys/${key.id}`, { method: 'DELETE' });
    if (!cleanup.ok) throw new Error('Previous synthetic key cleanup failed');
  }
}
const created = await call('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Synthetic browser verification', scopes: ['read'] }) });
if (!created.ok) throw new Error(`Key creation failed: ${created.status}`);
const { key, secret } = await created.json();
const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
let statuses;
try {
  const read = await call('/api/v1/brands', { headers });
  const denied = await call('/api/v1/scan', { method: 'POST', headers, body: '{}' });
  statuses = { noKey: missing.status, read: read.status, measureWithReadKey: denied.status };
} finally {
  const revoked = await call(`/api/keys/${key.id}`, { method: 'DELETE' });
  if (!revoked.ok) throw new Error('Synthetic key cleanup failed');
}
const after = await call('/api/v1/brands', { headers });
statuses.revoked = after.status;
console.log('API-key authorization:', statuses);
if (JSON.stringify(statuses) !== JSON.stringify({ noKey: 401, read: 200, measureWithReadKey: 403, revoked: 401 })) {
  throw new Error('API-key authorization regression');
}
