import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RadarPreview } from '../../components/marketing/radar-preview';

const base = {
  brandName: 'Notion',
  prompt: 'Which team wiki works for engineering?',
  brandMentioned: true,
  citations: [
    { url: 'https://publisher.example/article', provenance: 'provider_citation' },
    { url: 'https://prose-only.example/article', provenance: 'link_mentioned' },
  ],
};

test('completed preview shows only observed evidence and withholds confidence', () => {
  const html = renderToStaticMarkup(createElement(RadarPreview, { ...base, status: 'complete' }));
  assert.match(html, /The first Gemini answer below is real/);
  assert.match(html, /1 \/ 4 observed/);
  assert.match(html, /Mention observed/);
  assert.match(html, /Unavailable from one answer/);
  assert.match(html, /publisher\.example/);
  assert.doesNotMatch(html, /prose-only\.example/);
});

test('completed legacy answer with unknown mention status is not shown as a missed mention', () => {
  const html = renderToStaticMarkup(createElement(RadarPreview, { ...base, status: 'complete', brandMentioned: null }));
  assert.match(html, /Mention not assessed/);
  assert.match(html, /Inspect this answer before interpreting its mention status/);
  assert.doesNotMatch(html, /No mention observed/);
});

test('failed preview does not claim a real answer or a confidence range', () => {
  const html = renderToStaticMarkup(createElement(RadarPreview, { ...base, status: 'failed', brandMentioned: null, citations: [] }));
  assert.match(html, /The Gemini sample failed/);
  assert.match(html, /Sample failed/);
  assert.match(html, /0 \/ 4 observed/);
  assert.match(html, /Unavailable without a successful answer/);
  assert.match(html, /Retry the failed sample/);
  assert.doesNotMatch(html, /The first Gemini answer below is real/);
});

test('running preview waits instead of recommending a retry', () => {
  const html = renderToStaticMarkup(createElement(RadarPreview, { ...base, status: 'running', brandMentioned: null, citations: [] }));
  assert.match(html, /The Gemini sample is still running/);
  assert.match(html, /Wait for this sample to finish/);
  assert.doesNotMatch(html, /Retry the failed sample/);
});
