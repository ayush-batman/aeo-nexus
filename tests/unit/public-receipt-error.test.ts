import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReceiptError from '../../app/(marketing)/scan/[id]/error';

test('receipt load failure offers retry without exposing backend details or claiming scan failure', () => {
  const html = renderToStaticMarkup(createElement(ReceiptError, {
    error: Object.assign(new Error('private backend detail'), { digest: 'internal-123' }),
    reset: () => {},
  }));
  assert.match(html, /Receipt could not load/);
  assert.match(html, /Try again/);
  assert.match(html, /href="\/#scan"/);
  assert.match(html, /does not tell us whether your scan succeeded or failed/);
  assert.doesNotMatch(html, /private backend detail|internal-123/);
});
