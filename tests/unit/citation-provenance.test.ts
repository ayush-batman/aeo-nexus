import assert from 'node:assert/strict';
import test from 'node:test';

import {
  anthropicUsedWebSearch,
  collectCitationEvidence,
  extractAnthropicCitationReferences,
  extractGeminiCitationReferences,
  extractOpenAICitationReferences,
  extractPerplexityCitationReferences,
  extractProviderCitations,
  geminiUsedWebSearch,
  openAIUsedWebSearch,
  resolveGeminiCitationReferences,
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

test('Gemini redirect citations resolve to publisher URLs and preserve raw provider evidence', async () => {
  const original = {
    url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/source-token',
    title: 'Publisher result',
  };
  let calls = 0;
  const resolved = await resolveGeminiCitationReferences([original, { url: 'https://direct.test/page' }], async () => {
    calls += 1;
    return { status: 302, headers: { get: () => 'https://publisher.test/article' } };
  });
  const citations = extractProviderCitations(resolved, { ...context, provider: 'gemini' });
  assert.equal(calls, 1);
  assert.equal(citations[0].url, 'https://publisher.test/article');
  assert.equal(citations[0].provenance, 'provider_citation');
  assert.deepEqual(citations[0].raw_provider_reference, original);
  assert.equal(citations[1].url, 'https://direct.test/page');
});

test('unresolved Gemini redirects remain visible but cannot become source evidence', async () => {
  const original = {
    url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/source-token',
    title: 'Unresolved result',
  };
  const resolved = await resolveGeminiCitationReferences([original], async () => ({
    status: 503, headers: { get: () => null },
  }));
  const [citation] = extractProviderCitations(resolved, { ...context, provider: 'gemini' });
  assert.equal(citation.provenance, 'unverified');
  assert.deepEqual(citation.raw_provider_reference, original);
});

test('OpenAI Responses API web citations are retained alongside legacy annotations', () => {
  const citations = extractOpenAICitationReferences({
    output: [{ type: 'message', content: [{ type: 'output_text', text: 'Grounded answer', annotations: [
      { type: 'url_citation', url: 'https://publisher.test/openai', title: 'Publisher', start_index: 0, end_index: 8 },
      { type: 'file_citation', file_id: 'file-1', filename: 'notes.txt', index: 0 },
    ] }] }],
    choices: [{ message: { annotations: [{ url_citation: { url: 'https://legacy.test/source', title: 'Legacy' } }] } }],
  });
  assert.deepEqual(citations, [
    { url: 'https://legacy.test/source', title: 'Legacy' },
    { url: 'https://publisher.test/openai', title: 'Publisher' },
  ]);
});

test('Anthropic web-search citations retain publisher URLs from current and legacy shapes', () => {
  const citations = extractAnthropicCitationReferences({
    content: [{
      type: 'text',
      text: 'Grounded answer',
      citations: [
        {
          type: 'web_search_result_location',
          url: 'https://publisher.test/claude',
          title: 'Publisher',
          cited_text: 'Evidence',
        },
        {
          type: 'web_search_result_location',
          source: { url: 'https://legacy.test/claude', title: 'Legacy' },
        },
      ],
    }],
  });

  assert.deepEqual(citations, [
    { url: 'https://publisher.test/claude', title: 'Publisher' },
    { url: 'https://legacy.test/claude', title: 'Legacy' },
  ]);
});

test('provider search mode reflects actual tool use instead of configured capability', () => {
  assert.equal(openAIUsedWebSearch({ output: [{ type: 'message' }] }), false);
  assert.equal(openAIUsedWebSearch({ output: [{ type: 'web_search_call', status: 'completed' }] }), true);

  assert.equal(geminiUsedWebSearch({ candidates: [{ groundingMetadata: {} }] }), false);
  assert.equal(geminiUsedWebSearch({
    candidates: [{ groundingMetadata: { webSearchQueries: ['buyer query'] } }],
  }), true);

  assert.equal(anthropicUsedWebSearch({ content: [{ type: 'text', text: 'Answer' }] }), false);
  assert.equal(anthropicUsedWebSearch({
    content: [{ type: 'server_tool_use', name: 'web_search', input: {} }],
  }), true);
});
