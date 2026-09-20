// Central tier entitlements. Free = Gemini-only, capped, visibility-only.
// Paid (starter+) = all engines, uncapped, premium features.
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery } from '@/lib/auth-server';
import { planByStoredKey, type StoredPlanKey } from '@/lib/billing/plan-catalog';

export type Plan = StoredPlanKey;

const PAID_PLANS = new Set<Plan>(['starter', 'pro', 'agency', 'enterprise']);

export type Entitlements = {
    plan: Plan;
    paid: boolean;
    engines: string[];            // scan platforms allowed
    scanRuns: number;
    scanPeriod: 'rolling 7 days' | 'rolling 30 days' | null;
    brands: number | null;        // null = unlimited
    accuracy: boolean;
    drift: boolean;
    positioning: boolean;
};

export function entitlementsForPlan(plan: Plan): Entitlements {
    const definition = planByStoredKey(plan);
    const paid = PAID_PLANS.has(plan);
    if (paid) {
        return {
            plan,
            paid,
            engines: ['chatgpt', 'gemini', 'claude', 'perplexity'],
            scanRuns: definition.scanRuns,
            scanPeriod: definition.scanPeriod,
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
        scanRuns: definition.scanRuns,
        scanPeriod: definition.scanPeriod,
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
