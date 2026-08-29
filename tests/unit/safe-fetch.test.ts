import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isPublicIpAddress, safeFetchText } from '../../lib/security/safe-fetch';

test('private, loopback, link-local, metadata, and reserved addresses are blocked', () => {
  for (const address of [
    '0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '192.168.1.1', '224.0.0.1', '::', '::1', 'fc00::1',
    'fe80::1', 'ff02::1', '::ffff:127.0.0.1',
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true);
});

test('unsafe literal targets are rejected before a network request', async () => {
  await assert.rejects(safeFetchText('http://169.254.169.254/latest/meta-data'));
  await assert.rejects(safeFetchText('http://127.0.0.1:3000/admin'));
  await assert.rejects(safeFetchText('file:///etc/passwd'));
  await assert.rejects(safeFetchText('https://user:pass@example.com'));
});

test('safe fetch pins DNS, handles redirects manually, and limits response bytes', async () => {
  const source = await readFile(new URL('../../lib/security/safe-fetch.ts', import.meta.url), 'utf8');
  assert.match(source, /lookup\(/);
  assert.match(source, /redirect/i);
  assert.match(source, /maxBytes/);
  assert.match(source, /content-length/i);
  assert.match(source, /address:/);
});
