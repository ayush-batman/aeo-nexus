import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicScanMetadata } from '../../lib/measurement/public-scan-metadata';

const receipt = {
  brand_name: 'Buffer',
  platform: 'gemini',
  prompt: 'What are good alternatives to Buffer?',
  status: 'complete',
  brand_mentioned: true,
  mention_position: null,
  error_message: null,
};

test('complete receipt describes only the one saved answer, without claiming recommendation or score', () => {
  const metadata = buildPublicScanMetadata(receipt);
  assert.equal(metadata.title, 'Buffer, mentioned in one Gemini answer');
  assert.match(String(metadata.description), /one saved Gemini answer/);
  assert.match(String(metadata.description), /not a visibility score/);
  assert.doesNotMatch(String(metadata.description), /recommended|Live Gemini scan/);
});

test('unmentioned receipt does not imply all Gemini answers omit the brand', () => {
  const metadata = buildPublicScanMetadata({ ...receipt, brand_mentioned: false });
  assert.equal(metadata.title, 'Buffer, not mentioned in one Gemini answer');
  assert.match(String(metadata.description), /this one answer/);
});

test('a complete legacy receipt without a mention assessment does not become a negative result', () => {
  const metadata = buildPublicScanMetadata({ ...receipt, brand_mentioned: null });
  assert.equal(metadata.title, 'Buffer, one Gemini answer saved');
  assert.match(String(metadata.description), /mention status was not assessed/);
});

test('pending and failed receipts do not claim an answer exists', () => {
  for (const status of ['queued', 'running']) {
    const metadata = buildPublicScanMetadata({ ...receipt, status, brand_mentioned: null });
    assert.equal(metadata.title, 'Buffer, Gemini scan in progress');
    assert.match(String(metadata.description), /No answer or visibility result/);
  }
  const failed = buildPublicScanMetadata({ ...receipt, status: 'failed', brand_mentioned: null, error_message: 'timeout' });
  assert.equal(failed.title, 'Buffer, Gemini scan failed');
  assert.match(String(failed.description), /No usable answer or visibility result/);
});

test('an error flag never publishes a positive result, even on a legacy complete row', () => {
  const metadata = buildPublicScanMetadata({ ...receipt, error_message: 'provider error' });
  assert.equal(metadata.title, 'Buffer, Gemini scan failed');
});
