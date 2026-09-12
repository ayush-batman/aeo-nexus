import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeWithAI } from '../../lib/ai/ai-analyzer';
import { scanLLM, getAvailablePlatforms } from '../../lib/ai/llm-scanner';

test('simulation and unsupported engines fail explicitly instead of fabricating answers', async () => {
  const result = await scanLLM({ prompt: 'Best tools?', brandName: 'Aelo', platforms: ['mock', 'google_ai', 'google_ai_overview', 'bing_copilot'] });
  assert.equal(result.results.length, 0);
  assert.equal(result.errors.length, 4);
  assert.ok(result.errors.every((error) => error.error.startsWith('unsupported_engine')));
  assert.equal(getAvailablePlatforms().find((platform) => platform.platform === 'google_ai_overview')?.available, false);
});

test('configured engine names still fail without provider keys and never call a provider', async () => {
  const names = [
    'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY',
    'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT',
    'ANTHROPIC_API_KEY', 'PERPLEXITY_API_KEY',
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  for (const name of names) delete process.env[name];
  globalThis.fetch = async () => {
    providerCalls += 1;
    throw new Error('provider_request_must_not_run');
  };
  try {
    const result = await scanLLM({
      prompt: 'Best AI visibility tools?',
      brandName: 'Aelo',
      platforms: ['gemini', 'chatgpt', 'claude', 'perplexity'],
    });
    assert.equal(result.results.length, 0);
    assert.equal(result.errors.length, 4);
    assert.ok(result.errors.every((error) => /provider_not_configured|provider_request_failed/.test(error.error)));
    assert.equal(providerCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('one ChatGPT sample makes exactly one paid provider request', async () => {
  const names = [
    'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY',
    'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_ENDPOINT', 'OPENAI_API_KEY',
  ] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  for (const name of names) delete process.env[name];
  process.env.OPENAI_API_KEY = 'synthetic-never-sent';
  globalThis.fetch = async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({
      id: 'resp_test',
      object: 'response',
      created_at: 1,
      status: 'completed',
      model: 'gpt-4o-mini',
      output: [{
        id: 'msg_test',
        type: 'message',
        status: 'completed',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Aelo is listed first.', annotations: [] }],
      }],
      output_text: 'Aelo is listed first.',
      tools: [],
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await scanLLM({ prompt: 'Best tools?', brandName: 'Aelo', platforms: ['chatgpt'] });
    assert.equal(providerCalls, 1);
    assert.equal(result.results.length, 1);
    assert.equal(result.errors.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('AI sentiment cannot erase a real brand mention, and zero confidence is preserved', async () => {
  const originalFetch = globalThis.fetch;
  const previous = { google: process.env.GOOGLE_API_KEY, gemini: process.env.GEMINI_API_KEY, claude: process.env.ANTHROPIC_API_KEY };
  for (const key of ['GOOGLE_API_KEY', 'GEMINI_API_KEY']) delete process.env[key];
  process.env.ANTHROPIC_API_KEY = 'synthetic-never-sent';
  globalThis.fetch = async () => new Response(JSON.stringify({ model: 'synthetic-analyzer', content: [{ text: JSON.stringify({
    isKnownEntity: false, sentiment: 'neutral', sentimentScore: 0, confidence: 0, reason: 'Uncertain',
  }) }] }), { status: 200 });
  try {
    const result = await analyzeWithAI({ response: 'I do not know enough about Aelo to recommend it.', brandName: 'Aelo' });
    assert.equal(result.brandMentioned, true);
    assert.equal(result.confidence, 0);
    assert.equal(result.analyzerModel, 'synthetic-analyzer');
    assert.equal(result.analyzerPromptVersion, 'aelo-sentiment.v3');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries({ GOOGLE_API_KEY: previous.google, GEMINI_API_KEY: previous.gemini, ANTHROPIC_API_KEY: previous.claude })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('being first in a negative list cannot force positive sentiment', async () => {
  const previous = { GOOGLE_API_KEY: process.env.GOOGLE_API_KEY, GEMINI_API_KEY: process.env.GEMINI_API_KEY, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY };
  for (const key of Object.keys(previous)) delete process.env[key];
  try {
    const result = await analyzeWithAI({ response: 'Brands to avoid:\n1. Aelo has poor quality, bad support and terrible reliability.', brandName: 'Aelo' });
    assert.equal(result.mentionPosition, 1);
    assert.equal(result.sentiment, 'negative');
    assert.equal(result.analyzerMethod, 'deterministic-mentions+keyword-sentiment');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('keyword estimates handle negation, word boundaries and domain-only brand mentions', async () => {
  const previous = { GOOGLE_API_KEY: process.env.GOOGLE_API_KEY, GEMINI_API_KEY: process.env.GEMINI_API_KEY, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY };
  for (const key of Object.keys(previous)) delete process.env[key];
  try {
    for (const response of ['Aelo is unreliable.', 'Aelo is not very reliable.', 'Aelo is not recommended.', 'Aelo is low quality.']) {
      const result = await analyzeWithAI({ response, brandName: 'Aelo' });
      assert.equal(result.sentiment, 'negative', response); assert.equal(result.confidence, 0);
    }
    const domain = await analyzeWithAI({ response: `${'Unrelated introduction. '.repeat(30)} aelohq.com is terrible.`, brandName: 'Aelo', brandDomain: 'aelohq.com' });
    assert.equal(domain.brandMentioned, true); assert.equal(domain.sentiment, 'negative');
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
