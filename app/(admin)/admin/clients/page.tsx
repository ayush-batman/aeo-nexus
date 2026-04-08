import { getAllOrganizations, getOrganizationWithUsers } from "@/lib/admin";
import {
    Users,
    Building2,
    Calendar,
    CreditCard,
    Briefcase,
    Search
} from "lucide-react";
import Link from "next/link";

export default async function ClientsPage() {
    const organizations = await getAllOrganizations();

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Client Management
                </h1>
                <p className="text-[var(--text-secondary)]">
                    View and manage all organizations on the platform
                </p>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
                    <input
                        type="text"
                        placeholder="Search organizations..."
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-white placeholder:text-[var(--text-ghost)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                </div>
                <select className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                    <option value="">All Plans</option>
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                    <option value="enterprise">Enterprise</option>
                </select>
            </div>

            {/* Organizations Table */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[var(--bg-raised)]">
                        <tr>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                                Organization
                            </th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                                Plan
                            </th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                                Created
                            </th>
                            <th className="text-left px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                                Stripe ID
                            </th>
                            <th className="text-right px-6 py-4 text-sm font-medium text-[var(--text-secondary)]">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {organizations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-[var(--text-ghost)]">
                                    <Building2 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                                    <p>No organizations found</p>
                                </td>
                            </tr>
                        ) : (
                            organizations.map((org) => (
                                <tr key={org.id} className="hover:bg-[var(--bg-raised)]/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{org.name}</p>
                                                <p className="text-[var(--text-ghost)] text-sm">{org.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPlanBadgeClass(org.plan)}`}>
                                            {org.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
                                        {new Date(org.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-[var(--text-ghost)] text-sm font-mono">
                                        {org.stripe_customer_id ? (
                                            <span className="text-emerald-400">{org.stripe_customer_id.slice(0, 12)}...</span>
                                        ) : (
                                            <span className="text-[var(--text-ghost)]">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/clients/${org.id}`}
                                            className="text-sm text-indigo-400 hover:text-indigo-300"
                                        >
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{organizations.length}</p>
                        <p className="text-[var(--text-ghost)] text-sm">Total Organizations</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400">
                        <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">
                            {organizations.filter(o => o.plan !== 'free').length}
                        </p>
                        <p className="text-[var(--text-ghost)] text-sm">Paid Subscriptions</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-600/20 text-amber-400">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">
                            {organizations.filter(o => o.plan === 'agency' || o.plan === 'enterprise').length}
                        </p>
                        <p className="text-[var(--text-ghost)] text-sm">Enterprise Clients</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getPlanBadgeClass(plan: string): string {
    const classes: Record<string, string> = {
        free: "bg-[var(--bg-raised)] text-[var(--text-secondary)]",
        starter: "bg-emerald-900/50 text-emerald-400 border border-emerald-700",
        pro: "bg-violet-900/50 text-indigo-400 border border-violet-700",
        agency: "bg-rose-900/50 text-rose-400 border border-rose-700",
        enterprise: "bg-amber-900/50 text-amber-400 border border-amber-700",
    };
    return classes[plan] || classes.free;
}
