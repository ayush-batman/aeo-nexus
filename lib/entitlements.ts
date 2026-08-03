// Central tier entitlements. Free = Gemini-only, capped, visibility-only.
// Paid (starter+) = all engines, uncapped, premium features.
import { createClient } from '@/lib/supabase/server';

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

export async function getEntitlements(orgId: string): Promise<Entitlements> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('organizations')
        .select('plan')
        .eq('id', orgId)
        .single();
    return entitlementsForPlan((data?.plan as Plan) ?? 'free');
}

/** Count scans run across an org's workspaces in the trailing 7 days. */
export async function scansThisWeek(orgId: string): Promise<number> {
    const supabase = await createClient();
    const { data: ws } = await supabase.from('workspaces').select('id').eq('org_id', orgId);
    const ids = (ws ?? []).map((w: { id: string }) => w.id);
    if (ids.length === 0) return 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
        .from('llm_scans')
        .select('id', { count: 'exact', head: true })
        .in('workspace_id', ids)
        .gte('created_at', weekAgo);
    return count ?? 0;
}
