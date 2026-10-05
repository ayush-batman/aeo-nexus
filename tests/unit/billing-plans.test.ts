import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRazorpayPlan,
  getRazorpayPlanFromPlanId,
  getRazorpayPlanIdForPlan,
  getStripePlanFromPrice,
  getStripePriceForPlan,
} from '../../lib/billing/plans';

test('Razorpay aliases resolve to server-owned plan, amount, and currency', () => {
  assert.deepEqual(getRazorpayPlan('radar'), {
    amount: 499_900,
    currency: 'INR',
    dbPlan: 'starter',
    displayName: 'Radar',
  });
  assert.equal(getRazorpayPlan('starter')?.dbPlan, 'starter');
  assert.equal(getRazorpayPlan('command')?.dbPlan, 'pro');
  assert.equal(getRazorpayPlan('concierge')?.dbPlan, 'agency');
  assert.equal(getRazorpayPlan('enterprise'), null);
  assert.equal(getRazorpayPlan('free'), null);
});

test('Stripe price mappings fail closed when IDs are missing or placeholders', () => {
  const env = {
    STRIPE_STARTER_PRICE_ID: 'price_live_starter',
    STRIPE_PRO_PRICE_ID: 'price_pro',
    STRIPE_AGENCY_PRICE_ID: '',
  };

  assert.equal(getStripePriceForPlan('starter', env), 'price_live_starter');
  assert.equal(getStripePriceForPlan('pro', env), null);
  assert.equal(getStripePriceForPlan('agency', env), null);
  assert.equal(getStripePlanFromPrice('price_live_starter', env), 'starter');
  assert.equal(getStripePlanFromPrice('price_unknown', env), null);
});


test('Razorpay subscription plan ids map both ways and fail closed', () => {
  const env = { RAZORPAY_STARTER_PLAN_ID: 'plan_Radar1', RAZORPAY_PRO_PLAN_ID: 'not-a-plan', RAZORPAY_AGENCY_PLAN_ID: '' };
  assert.equal(getRazorpayPlanIdForPlan('starter', env), 'plan_Radar1');
  assert.equal(getRazorpayPlanIdForPlan('pro', env), null);
  assert.equal(getRazorpayPlanIdForPlan('agency', env), null);
  assert.equal(getRazorpayPlanIdForPlan('free', env), null);
  assert.equal(getRazorpayPlanFromPlanId('plan_Radar1', env), 'starter');
  assert.equal(getRazorpayPlanFromPlanId('not-a-plan', env), null);
  assert.equal(getRazorpayPlanFromPlanId('plan_Other', env), null);
});
