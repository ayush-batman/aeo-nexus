import { planByCheckoutKey, planByStoredKey } from './plan-catalog';

export type BillablePlan = 'starter' | 'pro' | 'agency';

export interface RazorpayPlan {
  amount: number;
  currency: 'INR';
  dbPlan: BillablePlan;
  displayName: string;
}

type BillingEnvironment = Record<string, string | undefined>;

const RAZORPAY_PLANS: Readonly<Record<string, RazorpayPlan>> = {
  radar: {
    amount: planByCheckoutKey('radar')!.amountPaise,
    currency: 'INR',
    dbPlan: 'starter',
    displayName: planByCheckoutKey('radar')!.name,
  },
  starter: {
    amount: planByStoredKey('starter').amountPaise,
    currency: 'INR',
    dbPlan: 'starter',
    displayName: planByStoredKey('starter').name,
  },
  command: {
    amount: planByCheckoutKey('command')!.amountPaise,
    currency: 'INR',
    dbPlan: 'pro',
    displayName: planByCheckoutKey('command')!.name,
  },
  pro: {
    amount: planByStoredKey('pro').amountPaise,
    currency: 'INR',
    dbPlan: 'pro',
    displayName: planByStoredKey('pro').name,
  },
  concierge: {
    amount: planByCheckoutKey('concierge')!.amountPaise,
    currency: 'INR',
    dbPlan: 'agency',
    displayName: planByCheckoutKey('concierge')!.name,
  },
  agency: {
    amount: planByStoredKey('agency').amountPaise,
    currency: 'INR',
    dbPlan: 'agency',
    displayName: planByStoredKey('agency').name,
  },
};

const STRIPE_PRICE_ENV: Readonly<Record<BillablePlan, string>> = {
  starter: 'STRIPE_STARTER_PRICE_ID',
  pro: 'STRIPE_PRO_PRICE_ID',
  agency: 'STRIPE_AGENCY_PRICE_ID',
};

export function isBillablePlan(value: unknown): value is BillablePlan {
  return value === 'starter' || value === 'pro' || value === 'agency';
}

export function getRazorpayPlan(value: unknown): RazorpayPlan | null {
  if (typeof value !== 'string') return null;
  return RAZORPAY_PLANS[value] ?? null;
}

function configuredStripePrice(value: string | undefined): string | null {
  if (!value) return null;
  if (value === 'price_starter' || value === 'price_pro' || value === 'price_agency') {
    return null;
  }
  return value;
}

export function getStripePriceForPlan(
  plan: unknown,
  environment: BillingEnvironment,
): string | null {
  if (!isBillablePlan(plan)) return null;
  return configuredStripePrice(environment[STRIPE_PRICE_ENV[plan]]);
}

export function getStripePlanFromPrice(
  priceId: unknown,
  environment: BillingEnvironment,
): BillablePlan | null {
  if (typeof priceId !== 'string' || !priceId) return null;

  for (const plan of Object.keys(STRIPE_PRICE_ENV) as BillablePlan[]) {
    if (configuredStripePrice(environment[STRIPE_PRICE_ENV[plan]]) === priceId) {
      return plan;
    }
  }

  return null;
}
