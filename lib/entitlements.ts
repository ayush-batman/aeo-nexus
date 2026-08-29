// Central tier entitlements. Free = Gemini-only, capped, visibility-only.
// Paid (starter+) = all engines, uncapped, premium features.
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

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
            engines: ['chatgpt', 'gemini', 'claude', 'perplexity', 'google_ai'],
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

export async function getEntitlements(
    orgId: string,
    admin: AdminClient = createAdminClient(),
): Promise<Entitlements> {
    const { data, error } = await admin
        .from('organizations')
        .select('plan')
        .eq('id', orgId)
        .single();
    if (error) throw new Error(`Could not load entitlements: ${error.message}`);
    return entitlementsForPlan((data?.plan as Plan) ?? 'free');
}

export async function reserveScanQuota(
    orgId: string,
    requestId: string,
    admin: AdminClient = createAdminClient(),
): Promise<'reserved' | 'duplicate' | 'denied'> {
    const { data, error } = await admin.rpc('reserve_scan_quota', {
        p_org_id: orgId,
        p_request_id: requestId,
        p_units: 1,
    });
    if (error) throw new Error(`Could not reserve scan quota: ${error.message}`);
    if (data !== 'reserved' && data !== 'duplicate' && data !== 'denied') {
        throw new Error('Scan quota function returned an invalid result');
    }
    return data;
}

/** Count scans run across an org's workspaces in the trailing 7 days. */
export async function scansThisWeek(orgId: string): Promise<number> {
    const admin = createAdminClient();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
        .from('scan_quota_reservations')
        .select('units')
        .eq('org_id', orgId)
        .gte('created_at', weekAgo);
    if (error) throw new Error(`Could not load scan usage: ${error.message}`);
    return (data ?? []).reduce((sum, row) => sum + Number(row.units || 0), 0);
}
