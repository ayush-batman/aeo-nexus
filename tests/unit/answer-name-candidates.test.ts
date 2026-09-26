import assert from 'node:assert/strict';
import test from 'node:test';
import { extractAnswerNameCandidates } from '../../lib/ai/answer-name-candidates';

test('extracts answer-backed possible names without presenting the target or headings as rivals', () => {
  const answer = [
    'For a five-person team, consider these alternatives:',
    '*   **Hootsuite** is a scheduling tool with approvals.',
    '* **Planable** offers a collaborative content calendar.',
    '* **Key features** include queues and analytics.',
    '* **Buffer** is the product to replace.',
    '* **HOOTSUITE** provides another workflow.',
  ].join('\n');
  const candidates = extractAnswerNameCandidates(answer, 'Buffer');
  assert.deepEqual(candidates.map(row => row.name), ['Hootsuite', 'Planable']);
  assert.equal(candidates[0].evidence, '*   **Hootsuite** is a scheduling tool with approvals.');
  assert.ok(candidates.every(row => answer.includes(row.evidence)));
});

test('does not guess from prose, generic sections or malformed long list entries', () => {
  assert.deepEqual(extractAnswerNameCandidates('Hootsuite and Planable are options.\n* **Key features** are useful.', 'Buffer'), []);
  assert.deepEqual(extractAnswerNameCandidates('* **<script>** is dangerous.\n* **This tool** is generic.', 'Buffer'), []);
  const lines = Array.from({ length: 12 }, (_, index) => `- **Brand${index}** offers a product.`).join('\n');
  assert.equal(extractAnswerNameCandidates(lines, 'Buffer').length, 8);
  const longLine = `- **Planable** offers ${'details '.repeat(80)}`;
  const candidate = extractAnswerNameCandidates(longLine, 'Buffer')[0];
  assert.ok(candidate.evidence.length <= 240);
  assert.ok(longLine.includes(candidate.evidence));
});
