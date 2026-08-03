import { getOrgUsage } from "@/lib/admin";
import { Activity, Users, CreditCard, TrendingUp, Zap } from "lucide-react";

function timeAgo(iso: string | null): string {
    if (!iso) return "never";
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d ago`;
    const h = Math.floor(diff / 3600000);
    if (h > 0) return `${h}h ago`;
    const m = Math.floor(diff / 60000);
    if (m > 0) return `${m}m ago`;
    return "just now";
}

function planBadge(plan: string): string {
    const classes: Record<string, string> = {
        free: "bg-[var(--bg-raised)]/80 text-[var(--text-secondary)] border border-[var(--border-default)]/50",
        starter: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
        pro: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
        agency: "bg-[var(--accent-muted)] text-[var(--accent-base)] border border-[var(--accent-base)]/25",
        enterprise: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    };
    return classes[plan] || classes.free;
}

export default async function AdminUsagePage() {
    const { rows, summary } = await getOrgUsage();

    const stats = [
        { label: "Total accounts", value: summary.totalOrgs, icon: Users, color: "text-emerald-400" },
        { label: "Paying", value: summary.paidOrgs, icon: CreditCard, color: "text-amber-400" },
        { label: "Free", value: summary.freeOrgs, icon: Users, color: "text-[var(--text-secondary)]" },
        { label: "Free → paid", value: `${summary.conversionRate}%`, icon: TrendingUp, color: "text-[var(--accent-base)]" },
        { label: "Active (7d)", value: summary.activeLast7d, icon: Zap, color: "text-blue-400" },
        { label: "Total scans", value: summary.totalScans, icon: Activity, color: "text-blue-400" },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-[var(--accent-muted)] rounded-lg border border-[var(--accent-base)]/25">
                        <Activity className="w-6 h-6 text-[var(--accent-base)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Usage</h1>
                </div>
                <p className="text-[var(--text-secondary)] ml-12">
                    Who signed up, who pays, and how much each account uses the platform.
                </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="bg-[var(--bg-base)]/40 border border-[var(--border-default)]/80 rounded-xl p-4"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-xs font-medium">{s.label}</span>
                            <s.icon className={`w-4 h-4 ${s.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-white tracking-tight">
                            {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Per-account table */}
            <div className="bg-[var(--bg-base)]/40 border border-[var(--border-default)]/80 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border-default)]/60 text-[var(--text-ghost)] text-xs uppercase tracking-wide">
                                <th className="text-left font-medium px-5 py-3">Account</th>
                                <th className="text-left font-medium px-5 py-3">Plan</th>
                                <th className="text-right font-medium px-5 py-3">Users</th>
                                <th className="text-right font-medium px-5 py-3">Scans</th>
                                <th className="text-right font-medium px-5 py-3">Last active</th>
                                <th className="text-right font-medium px-5 py-3">Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-ghost)] italic">
                                        No accounts yet
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-b border-[var(--border-default)]/30 hover:bg-[var(--bg-raised)]/40 transition-colors"
                                    >
                                        <td className="px-5 py-3">
                                            <span className="text-white font-medium">{r.name}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${planBadge(r.plan)}`}>
                                                {r.plan}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{r.users}</td>
                                        <td className="px-5 py-3 text-right text-white font-semibold">{r.scans.toLocaleString()}</td>
                                        <td className="px-5 py-3 text-right text-[var(--text-secondary)]">{timeAgo(r.lastActive)}</td>
                                        <td className="px-5 py-3 text-right text-[var(--text-ghost)]">
                                            {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
