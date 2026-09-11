// Central tier entitlements. Free = Gemini-only, capped, visibility-only.
// Paid (starter+) = all engines, uncapped, premium features.
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';

export type Plan = 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';

const PAID_PLANS = new Set<Plan>(['starter', 'pro', 'agency', 'enterprise']);

export type Entitlements = {
    plan: Plan;
    paid: boolean;
    engines: string[];            // scan platforms allowed
    scansPerWeek: number | null;  // null = unlimited
    brands: number | null;        // null = unlimited
    accuracy: boolean;
    drift: boolean;
    positioning: boolean;
};

export function entitlementsForPlan(plan: Plan): Entitlements {
    const paid = PAID_PLANS.has(plan);
    if (paid) {
        return {
            plan,
            paid,
            engines: ['chatgpt', 'gemini', 'claude', 'perplexity'],
            scansPerWeek: null,
            brands: null,
            accuracy: true,
            drift: true,
            positioning: true,
        };
    }
    return {
        plan,
        paid,
        engines: ['gemini'],
        scansPerWeek: 3,
        brands: 1,
        accuracy: false,
        drift: false,
        positioning: false,
    };
}

/** UI display only. Convex rechecks the stored plan on every protected operation. */
export async function getEntitlements(orgId: string): Promise<Entitlements> {
  const organization = await fetchAuthQuery(api.settings.organization, { orgId });
  return entitlementsForPlan(organization.plan);
}
