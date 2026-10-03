import assert from 'node:assert/strict';
import test from 'node:test';
import { promptNamesBrand, suggestedBuyerPrompts } from '../../lib/measurement/buyer-prompts';

test('onboarding suggests unbranded buyer questions instead of prompting brand echoes', () => {
  const prompts = suggestedBuyerPrompts('saas', 'QA testers');
  assert.equal(prompts.length, 3);
  assert.ok(prompts.every((prompt) => prompt.includes('QA testers')));
  assert.ok(prompts.every((prompt) => !promptNamesBrand(prompt, 'Aelo QA Fixture')));
});

test('branded questions are flagged for interpretation even when user edits them', () => {
  assert.equal(promptNamesBrand('Aelo QA Fixture vs alternatives', 'aelo qa fixture'), true);
  assert.equal(promptNamesBrand('Which software works for QA testers?', 'Aelo QA Fixture'), false);
  assert.equal(promptNamesBrand('Anything', '  '), false);
});
