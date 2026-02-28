import { getPlatformStats } from "@/lib/admin";
import {
    BarChart3,
    TrendingUp,
    Search,
    MessageSquare,
    Calendar
} from "lucide-react";

export default async function AdminAnalyticsPage() {
    const stats = await getPlatformStats();

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Platform Analytics
                </h1>
                <p className="text-[var(--text-muted)]">
                    Usage metrics across all organizations
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Search className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">Total LLM Scans</p>
                            <p className="text-2xl font-bold text-white">{stats.totalScans.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Platform-wide</span>
                    </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-emerald-600/20 text-emerald-400">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">Active Organizations</p>
                            <p className="text-2xl font-bold text-white">{stats.totalOrganizations}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>All time</span>
                    </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-amber-600/20 text-amber-400">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">Avg Scans/Org</p>
                            <p className="text-2xl font-bold text-white">
                                {stats.totalOrganizations > 0
                                    ? Math.round(stats.totalScans / stats.totalOrganizations)
                                    : 0}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Per organization</span>
                    </div>
                </div>
            </div>

            {/* Plan Usage */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-6">
                    Usage by Plan
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {['free', 'starter', 'pro', 'agency', 'enterprise'].map((plan) => {
                        const count = stats.planBreakdown[plan] || 0;
                        const percentage = stats.totalOrganizations > 0
                            ? ((count / stats.totalOrganizations) * 100).toFixed(1)
                            : '0';

                        return (
                            <div key={plan} className="text-center p-4 bg-[var(--surface-elevated)] rounded-lg">
                                <p className="text-3xl font-bold text-white mb-1">{count}</p>
                                <p className="text-[var(--text-muted)] text-sm capitalize mb-2">{plan}</p>
                                <p className="text-[var(--text-ghost)] text-xs">{percentage}%</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Coming Soon */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
                <BarChart3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                    Advanced Analytics Coming Soon
                </h3>
                <p className="text-[var(--text-ghost)] max-w-md mx-auto">
                    Detailed charts for daily active users, feature usage trends,
                    revenue metrics, and customer health scores.
                </p>
            </div>
        </div>
    );
}
