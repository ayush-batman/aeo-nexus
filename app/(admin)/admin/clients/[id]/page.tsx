import { getOrganizationWithUsers } from "@/lib/admin";
import {
    Building2,
    Users,
    Briefcase,
    Calendar,
    CreditCard,
    ArrowLeft,
    Mail,
    Shield
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const { id } = await params;
    const { organization, users, workspaces } = await getOrganizationWithUsers(id);

    if (!organization) {
        notFound();
    }

    return (
        <div className="p-8">
            {/* Back Link */}
            <Link
                href="/admin/clients"
                className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Clients
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">
                            {organization.name}
                        </h1>
                        <p className="text-[var(--text-ghost)] font-mono text-sm">{organization.id}</p>
                    </div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getPlanBadgeClass(organization.plan)}`}>
                    {organization.plan} plan
                </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Created</span>
                    </div>
                    <p className="text-white font-medium">
                        {new Date(organization.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Team Members</span>
                    </div>
                    <p className="text-white font-medium">{users.length} users</p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-sm">Workspaces</span>
                    </div>
                    <p className="text-white font-medium">{workspaces.length} brands</p>
                </div>
            </div>

            {/* Stripe Info */}
            {(organization.stripe_customer_id || organization.stripe_subscription_id) && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                        Billing Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[var(--text-ghost)] text-sm mb-1">Stripe Customer ID</p>
                            <p className="text-white font-mono text-sm">
                                {organization.stripe_customer_id || '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[var(--text-ghost)] text-sm mb-1">Subscription ID</p>
                            <p className="text-white font-mono text-sm">
                                {organization.stripe_subscription_id || '—'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-400" />
                        Team Members
                    </h2>
                </div>
                <table className="w-full">
                    <thead className="bg-[var(--surface-elevated)]">
                        <tr>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[var(--text-muted)]">User</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[var(--text-muted)]">Role</th>
                            <th className="text-left px-6 py-3 text-sm font-medium text-[var(--text-muted)]">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-[var(--surface-elevated)]/30">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center">
                                            <span className="text-white text-sm font-medium">
                                                {user.full_name?.[0] || user.email[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{user.full_name || 'Unknown'}</p>
                                            <p className="text-[var(--text-ghost)] text-sm">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-[var(--text-muted)] text-sm">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Workspaces */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-emerald-400" />
                        Workspaces (Brands)
                    </h2>
                </div>
                <div className="p-6">
                    {workspaces.length === 0 ? (
                        <p className="text-[var(--text-ghost)]">No workspaces created</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workspaces.map((ws) => (
                                <div key={ws.id} className="bg-[var(--surface-elevated)] rounded-lg p-4">
                                    <p className="text-white font-medium">{ws.name}</p>
                                    <p className="text-[var(--text-ghost)] text-sm">
                                        Created {new Date(ws.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getPlanBadgeClass(plan: string): string {
    const classes: Record<string, string> = {
        free: "bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
        starter: "bg-emerald-900/50 text-emerald-400 border border-emerald-700",
        pro: "bg-violet-900/50 text-indigo-400 border border-violet-700",
        agency: "bg-rose-900/50 text-rose-400 border border-rose-700",
        enterprise: "bg-amber-900/50 text-amber-400 border border-amber-700",
    };
    return classes[plan] || classes.free;
}

function getRoleBadgeClass(role: string): string {
    const classes: Record<string, string> = {
        owner: "bg-amber-900/50 text-amber-400",
        admin: "bg-violet-900/50 text-indigo-400",
        editor: "bg-emerald-900/50 text-emerald-400",
        viewer: "bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
    };
    return classes[role] || classes.viewer;
}
