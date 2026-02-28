import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS } from '@/lib/config';

export async function getOrgUsage(orgId: string) {
    const supabase = await createClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Get Plan
    const { data: org } = await supabase
        .from('organizations')
        .select('plan')
        .eq('id', orgId)
        .single();

    const plan = org?.plan || 'free';
    // @ts-ignore
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // 2. Get Workspace IDs for this Org
    const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('org_id', orgId);

    const workspaceIds = workspaces?.map(w => w.id) || [];

    if (workspaceIds.length === 0) {
        // Return 0 usage but correct limits if no workspaces found (rare but possible)
        // Need to count members though, as they are on Org level
        const { count: memberCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId);

        return {
            plan,
            limits,
            usage: { scans: 0, threads: 0, members: memberCount || 0 }
        };
    }

    // 3. Count Scans (This Month)
    const { count: scanCount } = await supabase
        .from('llm_scans')
        .select('*', { count: 'exact', head: true })
        .in('workspace_id', workspaceIds)
        .gte('created_at', startOfMonth);

    // 4. Count Threads Discovered (This Month)
    const { count: threadCount } = await supabase
        .from('forum_threads')
        .select('*', { count: 'exact', head: true })
        .in('workspace_id', workspaceIds)
        .gte('created_at', startOfMonth);

    // 5. Count Members (Total)
    const { count: memberCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

    return {
        plan,
        limits,
        usage: {
            scans: scanCount || 0,
            threads: threadCount || 0,
            members: memberCount || 0
        }
    };
}

export async function checkUsageLimit(orgId: string, resource: 'scans' | 'threads' | 'members') {
    const { limits, usage } = await getOrgUsage(orgId);
    // @ts-ignore
    const limit = limits[resource];
    // @ts-ignore
    const current = usage[resource];

    if (limit === -1) return { allowed: true, limit, current };

    return {
        allowed: current < limit,
        limit,
        current
    };
}
