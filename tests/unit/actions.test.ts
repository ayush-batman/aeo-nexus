import assert from 'node:assert/strict';
import test from 'node:test';

import {
  actionFromInsight,
  canTransitionAction,
  normalizeActionInput,
} from '../../lib/actions';

test('action state transitions follow the proof workflow', () => {
  assert.equal(canTransitionAction('planned', 'in_progress'), true);
  assert.equal(canTransitionAction('in_progress', 'completed'), true);
  assert.equal(canTransitionAction('completed', 'measured'), true);
  assert.equal(canTransitionAction('measured', 'planned'), false);
  assert.equal(canTransitionAction('planned', 'measured'), false);
});

test('action input rejects missing evidence and invalid URLs', () => {
  assert.throws(() => normalizeActionInput({ title: 'Ship it' }), /hypothesis/i);
  assert.throws(() => normalizeActionInput({
    title: 'Ship it',
    hypothesis: 'This should improve buyer answers.',
    source_url: 'javascript:alert(1)',
  }), /source URL/i);
});

test('insight promotion has a stable idempotency key and baseline target', () => {
  const first = actionFromInsight({
    id: 'vis-best-crm',
    title: 'Invisible for best CRM',
    detail: 'No engine mentioned Aelo.',
    priority: 'high',
    actionHref: '/dashboard/content-studio',
    targetPrompt: 'What is the best CRM?',
  });
  const retry = actionFromInsight({
    id: 'vis-best-crm',
    title: 'Invisible for best CRM',
    detail: 'No engine mentioned Aelo.',
    priority: 'high',
    actionHref: '/dashboard/content-studio',
    targetPrompt: 'What is the best CRM?',
  });

  assert.equal(first.insight_key, retry.insight_key);
  assert.deepEqual(first.target_prompts, ['What is the best CRM?']);
  assert.equal(first.hypothesis, 'No engine mentioned Aelo.');
});
