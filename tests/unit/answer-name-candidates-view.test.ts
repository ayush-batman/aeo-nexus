import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerNameCandidates } from '../../components/marketing/answer-name-candidates';

test('public receipt labels candidate names as unverified, with verbatim evidence', () => {
  const html = renderToStaticMarkup(createElement(AnswerNameCandidates, {
    candidates: [{ name: 'Planable', evidence: '* **Planable** offers approval workflows.' }],
  }));
  assert.match(html, /Other names to review/);
  assert.match(html, /not verified competitors or recommendations/);
  assert.match(html, /Planable/);
  assert.match(html, /offers approval workflows/);
});

test('empty candidate extraction does not imply zero rivals', () => {
  const html = renderToStaticMarkup(createElement(AnswerNameCandidates, { candidates: [] }));
  assert.match(html, /Rival tracking was not configured/);
  assert.match(html, /does not mean the answer named no alternatives/);
  assert.doesNotMatch(html, /No competitors found/);
});
