import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hostnameMatchesBrand,
  matchesBrand,
  normalizeBrandHostname,
} from '../../lib/ai/brand-matching';

test('Aelo golden corpus rejects deletion and substring false positives', () => {
  for (const text of ['AEO is growing', 'SEO tooling', 'an aelohq competitor', 'Ael is a partial deletion']) {
    assert.equal(matchesBrand(text, ['Aelo']).matched, false, text);
  }
});

test('brand aliases match case, punctuation, possessive, plural, hyphen, and Unicode forms', () => {
  const fixtures: Array<[string, string[]]> = [
    ['Aelo is listed.', ['Aelo']],
    ["AELO'S visibility is strong", ['Aelo']],
    ['Teams compare Aelos in this category', ['Aelo']],
    ['Aelo-HQ is listed', ['Aelo HQ']],
    ['Aelo   HQ is listed', ['Aelo HQ']],
    ['Cafe\u0301 Labs is listed', ['Café Labs']],
    ['The product is also called North Star', ['Aelo', 'North Star']],
  ];

  for (const [text, aliases] of fixtures) {
    assert.equal(matchesBrand(text, aliases).matched, true, text);
  }
});

test('short brands require explicit brand or domain context', () => {
  assert.equal(matchesBrand('AI can summarize this', ['AI']).matched, false);
  assert.equal(matchesBrand('Press X to close', ['X']).matched, false);
  assert.equal(matchesBrand('Go to market', ['Go']).matched, false);
  assert.equal(matchesBrand('The X platform launched', ['X']).matched, true);
  assert.equal(matchesBrand('Try the Go brand', ['Go']).matched, true);
  assert.equal(matchesBrand('Visit ai.example.com', ['AI', 'ai.example.com']).matched, true);
});

test('hostnames normalize and match only exact or subdomain boundaries', () => {
  assert.equal(normalizeBrandHostname('https://WWW.Example.com/path?q=1'), 'example.com');
  assert.equal(normalizeBrandHostname('example.com.'), 'example.com');
  assert.equal(normalizeBrandHostname('https://bücher.example/path'), 'xn--bcher-kva.example');
  assert.equal(normalizeBrandHostname('not a host'), null);

  assert.equal(hostnameMatchesBrand('example.com', 'example.com'), true);
  assert.equal(hostnameMatchesBrand('www.example.com', 'example.com'), true);
  assert.equal(hostnameMatchesBrand('docs.example.com', 'https://example.com'), true);
  assert.equal(hostnameMatchesBrand('notexample.com', 'example.com'), false);
  assert.equal(hostnameMatchesBrand('example.com.evil.test', 'example.com'), false);
});
