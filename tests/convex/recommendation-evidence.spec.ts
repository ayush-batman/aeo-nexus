import { expect, test } from 'vitest';
import { recommendationEvidence } from '../../convex/lib/recommendationEvidence';

test('recommendation claims need bounded evidence in the saved answer', () => {
  const response = 'Alternatives to Buffer include Planable.';
  const input = { status: 'not_recommended' as const, evidence: response, response, brandMentioned: true, brandName: 'Buffer' };
  expect(recommendationEvidence(input)).toMatchObject({ recommendationStatus: 'not_recommended', recommendationEvidence: response });
  expect(recommendationEvidence({ ...input, evidence: 'Buffer is the best.' })).toMatchObject({ recommendationStatus: 'unassessed', recommendationEvidence: null });
  expect(recommendationEvidence({ ...input, evidence: 'x'.repeat(301) })).toMatchObject({ recommendationStatus: 'unassessed', recommendationEvidence: null });
  expect(recommendationEvidence({ ...input, evidence: 'Planable.' })).toMatchObject({ recommendationStatus: 'unassessed', recommendationEvidence: null });
  expect(recommendationEvidence({ ...input, brandMentioned: false })).toMatchObject({ recommendationStatus: 'not_mentioned', recommendationEvidence: null });
});
