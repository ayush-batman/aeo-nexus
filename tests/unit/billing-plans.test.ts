import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getRazorpayPlan,
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

