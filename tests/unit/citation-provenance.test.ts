import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectCitationEvidence,
  extractGeminiCitationReferences,
  extractPerplexityCitationReferences,
  extractProviderCitations,
} from '../../lib/ai/citation-provenance';

const context = {
  provider: 'perplexity',
  sampleId: 'sample-1',
  brandDomain: 'example.com',
} as const;

test('provider-native citations keep provenance and exact own-domain matching', () => {
  const citations = extractProviderCitations([
    'https://example.com/report',
    { url: 'https://research.test/a', title: 'Research A', id: 'result-2' },
    { url: 'https://notexample.com/', title: 'Impostor' },
  ], context);

  assert.equal(citations.length, 3);
  assert.deepEqual(citations[0], {
    url: 'https://example.com/report',
    title: 'example.com',
    is_own_domain: true,
    provenance: 'provider_citation',
    provider: 'perplexity',
    sample_id: 'sample-1',
    raw_provider_reference: 'https://example.com/report',
    fetch_validation: 'not_checked',
  });
  assert.equal(citations[1].title, 'Research A');
  assert.equal(citations[2].is_own_domain, false);
});

test('URLs found only in generated prose are links mentioned, not provider citations', () => {
  const citations = collectCitationEvidence({
    text: 'The model says https://example.com/post and https://elsewhere.test/x.',
    providerCitations: [],
    ...context,
  });

  assert.equal(citations.length, 2);
  assert.ok(citations.every((citation) => citation.provenance === 'link_mentioned'));
  assert.ok(citations.every((citation) => citation.fetch_validation === 'not_checked'));
});

test('structured provider evidence wins when the same URL also appears in prose', () => {
  const citations = collectCitationEvidence({
    text: 'Read https://research.test/a for more.',
    providerCitations: [{ url: 'https://research.test/a', title: 'Grounded result' }],
    ...context,
  });

  assert.equal(citations.length, 1);
  assert.equal(citations[0].provenance, 'provider_citation');
  assert.equal(citations[0].title, 'Grounded result');
});

test('invalid and private provider references are visibly unverified and never fetched', () => {
  const citations = extractProviderCitations([
    { url: 'javascript:alert(1)', title: 'Bad scheme' },
    { url: 'http://127.0.0.1/admin', title: 'Loopback' },
    { url: 'http://169.254.169.254/latest/meta-data', title: 'Metadata' },
    { url: 'http://[fe80::1]/internal', title: 'IPv6 link local' },
  ], context);

  assert.equal(citations.length, 4);
  assert.deepEqual(citations.map((citation) => citation.provenance), [
    'unverified',
    'unverified',
    'unverified',
    'unverified',
  ]);
  assert.deepEqual(citations.map((citation) => citation.fetch_validation), [
    'invalid',
    'blocked',
    'blocked',
    'blocked',
  ]);
});

test('structured Perplexity and Gemini citations are retained', () => {
  assert.deepEqual(extractPerplexityCitationReferences({
    citations: ['https://one.test/a'],
    search_results: [{ url: 'https://two.test/b', title: 'Two' }],
  }), [
    'https://one.test/a',
    { url: 'https://two.test/b', title: 'Two' },
  ]);

  assert.deepEqual(extractGeminiCitationReferences({
    candidates: [{
      groundingMetadata: {
        groundingChunks: [{ web: { uri: 'https://three.test/c', title: 'Three' } }],
      },
    }],
  }), [{ url: 'https://three.test/c', title: 'Three' }]);
});
