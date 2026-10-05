// Organizations that paid through the retired one-time Razorpay order flow keep
// a `pay_…` reference. They get 30 days from the day the expiry job first sees
// them (deploy day), whatever their payment date, then return to Free.
export const LEGACY_RAZORPAY_ACCESS_MS = 30 * 86_400_000;

export interface OrganizationBillingFields {
  plan: string;
  stripeSubscriptionId: string | null;
  razorpaySubscriptionId: string | null;
  billingProvider?: 'stripe' | 'razorpay';
  billingOccurredAt?: number;
  billingCancelsAt?: number | null;
}

export type BillingSummary =
  | { kind: 'none'; provider: null; cancelsAt: null; paidUntil: null }
  | { kind: 'subscription'; provider: 'stripe' | 'razorpay'; cancelsAt: number | null; paidUntil: null }
  | { kind: 'one_time'; provider: 'razorpay'; cancelsAt: null; paidUntil: number };

export function isLegacyRazorpayPayment(reference: string | null | undefined): reference is string {
  return typeof reference === 'string' && reference.startsWith('pay_');
}

/** Which provider currently bills the organization, if any. */
export function billingProviderOf(org: OrganizationBillingFields): 'stripe' | 'razorpay' | null {
  if (org.billingProvider) return org.billingProvider;
  if (org.stripeSubscriptionId) return 'stripe';
  if (org.razorpaySubscriptionId) return 'razorpay';
  return null;
}

export function legacyPaidUntil(org: OrganizationBillingFields, now: number): number {
  return org.billingCancelsAt ?? now + LEGACY_RAZORPAY_ACCESS_MS;
}

export function billingSummary(org: OrganizationBillingFields, now: number): BillingSummary {
  const provider = billingProviderOf(org);
  if (org.plan === 'free' || !provider) return { kind: 'none', provider: null, cancelsAt: null, paidUntil: null };
  if (provider === 'razorpay' && isLegacyRazorpayPayment(org.razorpaySubscriptionId)) {
    return { kind: 'one_time', provider, cancelsAt: null, paidUntil: legacyPaidUntil(org, now) };
  }
  const subscriptionId = provider === 'stripe' ? org.stripeSubscriptionId : org.razorpaySubscriptionId;
  if (!subscriptionId) return { kind: 'none', provider: null, cancelsAt: null, paidUntil: null };
  return { kind: 'subscription', provider, cancelsAt: org.billingCancelsAt ?? null, paidUntil: null };
}
