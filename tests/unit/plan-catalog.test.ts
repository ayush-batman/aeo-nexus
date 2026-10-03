import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAN_CATALOG,
  PUBLIC_PLANS,
  planByCheckoutKey,
  planByStoredKey,
} from '../../lib/billing/plan-catalog';

test('the public catalogue maps checkout names to stored billing keys', () => {
  assert.equal(planByCheckoutKey('radar')?.storedKey, 'starter');
  assert.equal(planByCheckoutKey('command')?.storedKey, 'pro');
  assert.equal(planByCheckoutKey('concierge')?.storedKey, 'agency');
  assert.equal(planByCheckoutKey('unknown'), null);
  assert.equal(planByStoredKey('unknown'), PLAN_CATALOG.free);
});

test('customer-visible prices and usage promises are exact', () => {
  assert.deepEqual(
    PUBLIC_PLANS.map((plan) => [plan.name, plan.amountPaise, plan.scanRuns, plan.scanPeriod]),
    [
      ['Free', 0, 3, 'rolling 7 days'],
      ['Radar', 499_900, 100, 'rolling 30 days'],
      ['Command', 1_499_900, 500, 'rolling 30 days'],
      ['Concierge', 5_000_000, 2_000, 'rolling 30 days'],
    ],
  );
  assert.match(PLAN_CATALOG.starter.features.join(' '), /when available/);
  assert.match(PLAN_CATALOG.starter.features.join(' '), /4 samples per engine/);
});
