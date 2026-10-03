import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCitationMap } from '../../lib/analytics/citation-map';
test('coverage includes successful answers without citations and deduplicates URLs per sample', () => {
  const citation = { url: 'https://www.example.com/Page', title: 'Source', provenance: 'provider_citation' };
  const base = { platform: 'gemini', response: 'Real answer', created_at: '2026-09-01' };
  const result = buildCitationMap([
    { ...base, id: '1', citations: [citation, citation] },
    { ...base, id: '2', citations: [{ ...citation, provenance: 'link_mentioned' }] },
    { ...base, id: '3', response: '', failure_code: 'provider_failed', citations: [] },
  ]);
  assert.equal(result.totalScansAnalyzed, 2);
  assert.equal(result.scansWithProviderCitations, 1);
  assert.equal(result.sources[0].scanCoveragePct, 50);
  assert.equal(result.sources[0].totalCitations, 1);
});
test('unrelated subdomains are not silently merged', () => {
  const result = buildCitationMap([{ id: '1', platform: 'gemini', response: 'answer', created_at: '2026-09-01', citations: [
    { url: 'https://forums.example.com/a', title: '', provenance: 'provider_citation' },
    { url: 'https://example.com/b', title: '', provenance: 'provider_citation' },
  ] }]);
  assert.equal(result.uniqueDomains, 2);
});
