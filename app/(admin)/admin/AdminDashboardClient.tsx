"use client";

import { useState, useEffect } from "react";
import { getPlatformStats, getAllOrganizations } from "@/lib/admin";
import {
    Building2,
    Users,
    Search,
    TrendingUp,
    CreditCard,
    ArrowUpRight,
    Activity
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export default function AdminDashboardClient({
    initialStats,
    initialOrgs
}: {
    initialStats: any,
    initialOrgs: any[]
}) {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-10"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Platform Command Center
                    </h1>
                </div>
                <p className="text-[var(--text-secondary)] ml-12 gap-2 flex items-center">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    System Online • All API Engines Functional
                </p>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8"
            >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Active Organizations"
                        value={initialStats.totalOrganizations}
                        icon={Building2}
                        gradient="from-indigo-500/20 to-violet-600/20"
                        iconColor="text-indigo-400"
                        borderColor="border-indigo-500/20"
                    />
                    <StatCard
                        title="Registered Users"
                        value={initialStats.totalUsers}
                        icon={Users}
                        gradient="from-emerald-600/20 to-teal-600/20"
                        iconColor="text-emerald-400"
                        borderColor="border-emerald-500/20"
                    />
                    <StatCard
                        title="Total AI Scans Conducted"
                        value={initialStats.totalScans}
                        icon={Search}
                        gradient="from-blue-600/20 to-cyan-600/20"
                        iconColor="text-blue-400"
                        borderColor="border-blue-500/20"
                    />
                    <StatCard
                        title="Paying Subscriptions"
                        value={
                            (initialStats.planBreakdown.starter || 0) +
                            (initialStats.planBreakdown.pro || 0) +
                            (initialStats.planBreakdown.agency || 0) +
                            (initialStats.planBreakdown.enterprise || 0)
                        }
                        icon={CreditCard}
                        gradient="from-amber-600/20 to-yellow-500/20"
                        iconColor="text-amber-400"
                        borderColor="border-amber-500/20"
                    />
                </div>

                {/* Sub-Grids */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Plan Breakdown */}
                    <motion.div
                        variants={itemVariants}
                        className="relative group overflow-hidden bg-[var(--bg-base)]/50 border border-[var(--border-default)]/80 rounded-2xl p-6 backdrop-blur-xl"
                    >
                        {/* Glow Effect */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                            Revenue Distribution
                        </h2>
                        <div className="space-y-5 relative z-10">
                            {['enterprise', 'agency', 'pro', 'starter', 'free'].map((plan) => (
                                <PlanBar
                                    key={plan}
                                    plan={plan}
                                    count={initialStats.planBreakdown[plan] || 0}
                                    total={initialStats.totalOrganizations}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Organizations */}
                    <motion.div
                        variants={itemVariants}
                        className="relative group overflow-hidden bg-[var(--bg-base)]/50 border border-[var(--border-default)]/80 rounded-2xl p-6 backdrop-blur-xl"
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-emerald-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-emerald-400" />
                                Newest Growth
                            </h2>
                            <Link
                                href="/admin/clients"
                                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20"
                            >
                                View all
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3 relative z-10">
                            {initialOrgs.length === 0 ? (
                                <p className="text-[var(--text-ghost)] text-sm italic">No organizations yet</p>
                            ) : (
                                initialOrgs.map((org, i) => (
                                    <motion.div
                                        key={org.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (i * 0.1) }}
                                        className="flex items-center justify-between p-4 bg-[var(--bg-surface)]/40 hover:bg-[var(--bg-raised)]/60 border border-[var(--border-default)]/50 hover:border-[var(--border-default)] transition-all rounded-xl group/item"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-secondary)] font-bold group-hover/item:bg-indigo-500/20 group-hover/item:text-indigo-300 transition-colors">
                                                {org.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium group-hover/item:text-violet-200 transition-colors">{org.name}</p>
                                                <p className="text-[var(--text-ghost)] text-xs mt-0.5">
                                                    Joined {new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${getPlanBadgeClass(org.plan)}`}>
                                            {org.plan}
                                        </span>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    gradient,
    iconColor,
    borderColor
}: {
    title: string;
    value: number;
    icon: React.ElementType;
    gradient: string;
    iconColor: string;
    borderColor: string;
}) {
    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden bg-[var(--bg-base)]/40 border border-[var(--border-default)]/80 rounded-2xl p-6 backdrop-blur-md group`}
        >
            {/* Subtle border glow on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="space-y-1">
                    <p className="text-[var(--text-secondary)] text-sm font-medium">{title}</p>
                    <p className="text-4xl font-bold text-white tracking-tight">{value.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-xl bg-[var(--bg-surface)] border ${borderColor} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
            </div>
        </motion.div>
    );
}

function PlanBar({
    plan,
    count,
    total,
}: {
    plan: string;
    count: number;
    total: number;
}) {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    const colors: Record<string, string> = {
        free: "bg-zinc-600 shadow-zinc-600/50",
        starter: "bg-emerald-500 shadow-emerald-500/50",
        pro: "bg-blue-500 shadow-blue-500/50",
        agency: "bg-indigo-500 shadow-violet-500/50",
        enterprise: "bg-amber-400 shadow-amber-400/50",
    };

    return (
        <div className="group">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-secondary)] capitalize group-hover:text-white transition-colors">{plan}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-ghost)]">{percentage.toFixed(1)}%</span>
                    <span className="text-sm font-bold text-white bg-[var(--bg-raised)] px-2 py-0.5 rounded-md">{count}</span>
                </div>
            </div>
            <div className="h-2.5 bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--border-default)]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className={`h-full ${colors[plan]} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                />
            </div>
        </div>
    );
}

function getPlanBadgeClass(plan: string): string {
    const classes: Record<string, string> = {
        free: "bg-[var(--bg-raised)]/80 text-[var(--text-secondary)] border border-[var(--border-default)]/50",
        starter: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
        pro: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
        agency: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30",
        enterprise: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    };
    return classes[plan] || classes.free;
}
