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
