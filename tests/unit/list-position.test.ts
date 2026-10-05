import assert from 'node:assert/strict';
import test from 'node:test';
import { findListPosition, parseListItems } from '../../lib/ai/ai-analyzer';

test('prose lines that start with numbers are not list items', () => {
  const response = 'Here are options:\n\n2026: the year of AI.\n\n3.5 stars is typical.\n\n1. Hootsuite - great\n2. Buffer - cheap\n3. Later - visual';
  assert.deepEqual(parseListItems(response), ['Hootsuite - great', 'Buffer - cheap', 'Later - visual']);
  assert.equal(findListPosition(response, 'Buffer'), 2);
});

test('numbered, bulleted and bold-led answers keep their order', () => {
  assert.equal(findListPosition('**1. Hootsuite**\n**2. Buffer**', 'Buffer'), 2);
  assert.equal(findListPosition('- Hootsuite\n- Buffer\n- Later', 'Buffer'), 2);
  const bold = '**Hootsuite**: enterprise\n\n**Buffer**: budget\n\n**Later**: visual';
  assert.deepEqual(parseListItems(bold), ['Hootsuite: enterprise', 'Buffer: budget', 'Later: visual']);
  assert.equal(findListPosition(bold, 'Buffer'), 2);
});

test('a brand outside the list has no list position', () => {
  assert.equal(findListPosition('Buffer is not ideal here. Consider:\n\n1. Hootsuite\n2. Sprout Social', 'Buffer'), null);
});
