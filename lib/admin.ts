// Admin utility functions for super-admin panel

import { createClient } from '@/lib/supabase/server';
import { User, Organization } from '@/lib/types';

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: userData } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

    return userData?.is_super_admin === true;
}

/**
 * Get the current user's profile
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    return userData;
}

/**
 * Get all organizations (super admin only - bypasses RLS via service role)
 */
export async function getAllOrganizations(): Promise<Organization[]> {
    const supabase = await createClient();

    // Note: This requires service role or RLS policy that allows super admins
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching organizations:', error);
        return [];
    }

    return data || [];
}

/**
 * Get organization details with user count
 */
export async function getOrganizationWithUsers(orgId: string) {
    const supabase = await createClient();

    const [orgResult, usersResult, workspacesResult] = await Promise.all([
        supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single(),
        supabase
            .from('users')
            .select('*')
            .eq('org_id', orgId),
        supabase
            .from('workspaces')
            .select('*')
            .eq('org_id', orgId)
    ]);

    return {
        organization: orgResult.data,
        users: usersResult.data || [],
        workspaces: workspacesResult.data || []
    };
}

/**
 * Get platform-wide statistics
 */
export async function getPlatformStats() {
    const supabase = await createClient();

    const [orgsResult, usersResult, scansResult] = await Promise.all([
        supabase.from('organizations').select('id, plan', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('llm_scans').select('id', { count: 'exact' })
    ]);

    const planCounts = (orgsResult.data || []).reduce((acc, org) => {
        acc[org.plan] = (acc[org.plan] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
        totalOrganizations: orgsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalScans: scansResult.count || 0,
        planBreakdown: planCounts
    };
}

const PAID_PLANS = new Set(['starter', 'pro', 'agency', 'enterprise']);

export type OrgUsageRow = {
    id: string;
    name: string;
    plan: string;
    paid: boolean;
    users: number;
    scans: number;
    lastActive: string | null;
    createdAt: string;
};

/**
 * Per-organization usage: scans run, last-active, users, plan.
 * Scans link via workspace_id -> workspaces.org_id, so we map in JS.
 */
export async function getOrgUsage(): Promise<{
    rows: OrgUsageRow[];
    summary: {
        totalOrgs: number;
        paidOrgs: number;
        freeOrgs: number;
        conversionRate: number;
        activeLast7d: number;
        totalScans: number;
    };
}> {
    const supabase = await createClient();

    const [orgsRes, wsRes, usersRes, scansRes] = await Promise.all([
        supabase.from('organizations').select('id, name, plan, created_at'),
        supabase.from('workspaces').select('id, org_id'),
        supabase.from('users').select('id, org_id'),
        supabase.from('llm_scans').select('workspace_id, created_at'),
    ]);

    const orgs = orgsRes.data || [];
    const workspaces = wsRes.data || [];
    const users = usersRes.data || [];
    const scans = scansRes.data || [];

    const wsToOrg = new Map<string, string>();
    workspaces.forEach((w: any) => wsToOrg.set(w.id, w.org_id));

    const usersByOrg = new Map<string, number>();
    users.forEach((u: any) => {
        if (u.org_id) usersByOrg.set(u.org_id, (usersByOrg.get(u.org_id) || 0) + 1);
    });

    const scanCountByOrg = new Map<string, number>();
    const lastActiveByOrg = new Map<string, string>();
    scans.forEach((s: any) => {
        const org = wsToOrg.get(s.workspace_id);
        if (!org) return;
        scanCountByOrg.set(org, (scanCountByOrg.get(org) || 0) + 1);
        const prev = lastActiveByOrg.get(org);
        if (!prev || s.created_at > prev) lastActiveByOrg.set(org, s.created_at);
    });

    const rows: OrgUsageRow[] = orgs
        .map((o: any) => ({
            id: o.id,
            name: o.name,
            plan: o.plan,
            paid: PAID_PLANS.has(o.plan),
            users: usersByOrg.get(o.id) || 0,
            scans: scanCountByOrg.get(o.id) || 0,
            lastActive: lastActiveByOrg.get(o.id) || null,
            createdAt: o.created_at,
        }))
        .sort((a, b) => b.scans - a.scans);

    const totalOrgs = rows.length;
    const paidOrgs = rows.filter((r) => r.paid).length;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeLast7d = rows.filter(
        (r) => r.lastActive && new Date(r.lastActive).getTime() >= weekAgo
    ).length;

    return {
        rows,
        summary: {
            totalOrgs,
            paidOrgs,
            freeOrgs: totalOrgs - paidOrgs,
            conversionRate: totalOrgs ? Math.round((paidOrgs / totalOrgs) * 100) : 0,
            activeLast7d,
            totalScans: scans.length,
        },
    };
}
