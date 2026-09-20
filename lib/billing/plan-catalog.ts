export type StoredPlanKey = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';
export type CheckoutPlanKey = 'radar' | 'command' | 'concierge';

export type PublicPlan = {
  storedKey: StoredPlanKey;
  checkoutKey: CheckoutPlanKey | null;
  name: string;
  amountPaise: number;
  priceLabel: string;
  billingNote: string;
  summary: string;
  scanRuns: number;
  scanPeriod: 'rolling 7 days' | 'rolling 30 days' | null;
  scanPromise: string;
  forumThreads: number;
  members: number;
  engines: readonly string[];
  features: readonly string[];
  featured: boolean;
};

const ENGINE_PROMISE = 'ChatGPT, Gemini, Claude and Perplexity when available';

export const PLAN_CATALOG: Readonly<Record<StoredPlanKey, PublicPlan>> = {
  free: {
    storedKey: 'free', checkoutKey: null, name: 'Free', amountPaise: 0,
    priceLabel: '₹0', billingNote: 'No card', featured: false,
    summary: 'Inspect real Gemini answers before committing.',
    scanRuns: 3, scanPeriod: 'rolling 7 days', scanPromise: '3 scan runs every rolling 7 days',
    forumThreads: 20, members: 1, engines: ['Gemini'],
    features: ['1 tracked brand', '4 samples per scan run', 'Raw answers and public receipts', 'Provider source evidence when returned'],
  },
  starter: {
    storedKey: 'starter', checkoutKey: 'radar', name: 'Radar', amountPaise: 499_900,
    priceLabel: '₹4,999', billingNote: 'per month', featured: false,
    summary: 'Measure how your brand appears across available assistants.',
    scanRuns: 100, scanPeriod: 'rolling 30 days', scanPromise: '100 scan runs every rolling 30 days',
    forumThreads: 200, members: 2, engines: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'],
    features: [ENGINE_PROMISE, '4 samples per engine in each standard scan', 'Confidence ranges and source views', 'Recurring measurements', 'Up to 2 team members'],
  },
  pro: {
    storedKey: 'pro', checkoutKey: 'command', name: 'Command', amountPaise: 1_499_900,
    priceLabel: '₹14,999', billingNote: 'per month', featured: true,
    summary: 'Turn evidence gaps into assigned, measurable work.',
    scanRuns: 500, scanPeriod: 'rolling 30 days', scanPromise: '500 scan runs every rolling 30 days',
    forumThreads: -1, members: 5, engines: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'],
    features: [ENGINE_PROMISE, '4 samples per engine in each standard scan', 'Actions with follow-up receipts', 'Decision reports', 'Up to 5 team members', 'Priority support'],
  },
  agency: {
    storedKey: 'agency', checkoutKey: 'concierge', name: 'Concierge', amountPaise: 5_000_000,
    priceLabel: 'From ₹50,000', billingNote: 'per month', featured: false,
    summary: 'Add hands-on strategy and delivery support.',
    scanRuns: 2_000, scanPeriod: 'rolling 30 days', scanPromise: '2,000 scan runs every rolling 30 days',
    forumThreads: -1, members: 15, engines: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'],
    features: [ENGINE_PROMISE, '4 samples per engine in each standard scan', 'Dedicated strategy support', 'Custom prompt research', 'Leadership-ready reporting', 'Up to 15 team members'],
  },
  enterprise: {
    storedKey: 'enterprise', checkoutKey: null, name: 'Enterprise', amountPaise: 0,
    priceLabel: 'Custom', billingNote: 'contract', featured: false,
    summary: 'Custom limits and support for larger organizations.',
    scanRuns: -1, scanPeriod: null, scanPromise: 'Contracted scan allowance',
    forumThreads: -1, members: -1, engines: ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'],
    features: [ENGINE_PROMISE, 'Contracted usage and team limits'],
  },
};

export const PUBLIC_PLANS = [
  PLAN_CATALOG.free,
  PLAN_CATALOG.starter,
  PLAN_CATALOG.pro,
  PLAN_CATALOG.agency,
] as const;

export function planByStoredKey(value: unknown): PublicPlan {
  return typeof value === 'string' && value in PLAN_CATALOG
    ? PLAN_CATALOG[value as StoredPlanKey]
    : PLAN_CATALOG.free;
}

export function planByCheckoutKey(value: unknown): PublicPlan | null {
  if (typeof value !== 'string') return null;
  return PUBLIC_PLANS.find((plan) => plan.checkoutKey === value) ?? null;
}
