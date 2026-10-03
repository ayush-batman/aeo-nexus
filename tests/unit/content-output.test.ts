import test from 'node:test';
import assert from 'node:assert/strict';
import { questionDrafts, promptDrafts } from '../../lib/content-output';
import { parseOriginality, scoreOriginality } from '../../lib/ai/originality-scorer';
import { schemaDraft } from '../../lib/content-drafts';
test('question extraction requires source evidence and never guesses existing content', () => {
  const question = { text: 'Does it support SSO?', sourceQuote: 'Does it support SSO?', topic: 'Security', type: 'feature', priority: 'high', hasExistingContent: false };
  assert.throws(() => questionDrafts({ questions: [question] }, 'An unrelated conversation', 'support'), /ungrounded_question/);
  const result = questionDrafts({ questions: [question] }, 'Customer: Does it support SSO?', 'support');
  assert.equal(result.questions[0].hasExistingContent, null);
  assert.equal(result.questions[0].sourceQuote, question.sourceQuote);
  assert.equal(questionDrafts({ questions: [question] }, '', 'brainstorm').questions[0].evidenceStatus, 'unverified_suggestion');
  assert.throws(() => promptDrafts([{ category: 'Awareness', prompt: 1 }]));
});
test('originality is labelled as opinion; malformed output cannot manufacture a score', async () => {
  const value = { score: 70, informationGain: 60, derivativeRisk: 'low', uniqueAngles: ['Add original research'], genericPhrases: ['in conclusion', 'imaginary quote'], verdict: 'Subjective review' };
  const result = parseOriginality(JSON.stringify(value), 'in conclusion');
  assert.equal(result.evidenceStatus, 'subjective_ai_review');
  assert.deepEqual(result.genericPhrases, ['in conclusion']);
  assert.throws(() => parseOriginality(JSON.stringify({ ...value, score: 101 }), 'content'));
  const google = process.env.GOOGLE_API_KEY, gemini = process.env.GEMINI_API_KEY;
  Reflect.deleteProperty(process.env, 'GOOGLE_API_KEY'); Reflect.deleteProperty(process.env, 'GEMINI_API_KEY');
  try { await assert.rejects(scoreOriginality('Sample', 'Topic'), /not_configured/); }
  finally { if (google !== undefined) process.env.GOOGLE_API_KEY = google; if (gemini !== undefined) process.env.GEMINI_API_KEY = gemini; }
});
test('structured-data drafts omit unavailable facts', () => {
  const result = schemaDraft({ schemaType: 'local-business', brandName: 'Example' });
  assert.deepEqual(result.schema, { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Example' });
  assert.equal(result.status, 'draft');
  assert.throws(() => schemaDraft({ schemaType: 'Unknown', brandName: 'Example' }), /invalid_content/);
});
