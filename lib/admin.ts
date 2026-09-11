import { cache } from 'react';
import { api } from '@/convex/_generated/api';
import { fetchAuthQuery, getToken } from '@/lib/auth-server';
import { getConvexWorkspaceContext } from '@/lib/convex/session';
import type { FunctionReturnType } from 'convex/server';
import type { User, Organization } from './types';
export async function getCurrentUser(): Promise<User | null> {
  if (!await getToken()) return null;
  await getConvexWorkspaceContext();
  return fetchAuthQuery(api.admin.profile, {});
}
export async function isSuperAdmin() { return (await getCurrentUser())?.is_super_admin === true; }
async function allPages<T>(read: (cursor: string | null) => Promise<{ page: T[]; isDone: boolean; continueCursor: string }>): Promise<T[]> {
  const out: T[] = []; let cursor: string | null = null;
  do { const page = await read(cursor); out.push(...page.page); cursor = page.isDone ? null : page.continueCursor; } while (cursor);
  return out;
}
export const getAllOrganizations = cache(async (): Promise<Organization[]> => allPages(cursor =>
  fetchAuthQuery(api.admin.organizations, { paginationOpts: { numItems: 100, cursor } })));
const getAllMembers = cache(async () => allPages(cursor => fetchAuthQuery(api.admin.members, { paginationOpts: { numItems: 100, cursor } })));
export async function getOrganizationWithUsers(orgId: string) {
  const organization = await fetchAuthQuery(api.admin.organization, { orgId });
  if (!organization) return { organization: null, users: [], workspaces: [] };
  const [users, workspaces] = await Promise.all([
    allPages(cursor => fetchAuthQuery(api.admin.members, { orgId, paginationOpts: { numItems: 100, cursor } })),
    allPages(cursor => fetchAuthQuery(api.admin.workspaces, { orgId, paginationOpts: { numItems: 100, cursor } })),
  ]);
  return { organization, users, workspaces };
}
const usageCounts = cache(async () => {
  const pages = await allPages<FunctionReturnType<typeof api.admin.scanUsage>['page'][number]>(cursor =>
    fetchAuthQuery(api.admin.scanUsage, { paginationOpts: { numItems: 50, cursor } }));
  const groups = new Map<string, { count: number; lastActive: number }>();
  for (const row of pages) {
    const previous = groups.get(row.orgId);
    groups.set(row.orgId, { count: (previous?.count || 0) + row.count, lastActive: Math.max(previous?.lastActive || 0, row.lastActive) });
  }
  return groups;
});
export async function getPlatformStats() {
  const [orgs, members, usage] = await Promise.all([getAllOrganizations(), getAllMembers(), usageCounts()]);
  const planBreakdown: Record<string, number> = {};
  for (const org of orgs) planBreakdown[org.plan] = (planBreakdown[org.plan] || 0) + 1;
  return { totalOrganizations: orgs.length, totalUsers: new Set(members.map(user => user.id)).size,
    totalScans: [...usage.values()].reduce((sum, row) => sum + row.count, 0), planBreakdown };
}
export type OrgUsageRow = { id: string; name: string; plan: string; paid: boolean; users: number; scans: number; lastActive: string | null; createdAt: string };
export async function getOrgUsage() {
  const [orgs, members, usage] = await Promise.all([getAllOrganizations(), getAllMembers(), usageCounts()]);
  const counts = new Map<string, number>();
  for (const member of members) counts.set(member.org_id, (counts.get(member.org_id) || 0) + 1);
  const rows: OrgUsageRow[] = orgs.map(org => {
    const scans = usage.get(org.id);
    return { id: org.id, name: org.name, plan: org.plan, paid: org.plan !== 'free', users: counts.get(org.id) || 0,
      scans: scans?.count || 0, lastActive: scans ? new Date(scans.lastActive).toISOString() : null, createdAt: org.created_at };
  }).sort((a,b) => b.scans-a.scans);
  const paidOrgs = rows.filter(row => row.paid).length;
  return { rows, summary: { totalOrgs: rows.length, paidOrgs, freeOrgs: rows.length-paidOrgs,
    conversionRate: rows.length ? Math.round(paidOrgs/rows.length*100) : 0,
    activeLast7d: rows.filter(row => row.lastActive && Date.parse(row.lastActive) >= Date.now()-7*86400000).length,
    totalScans: rows.reduce((sum,row) => sum+row.scans,0) } };
}
