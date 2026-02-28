"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Search,
    FileText,
    MessageSquare,
    BarChart3,
    Package,
    Settings,
    LogOut,
    ChevronLeft,
    Zap,
    Sparkles,
    Swords,
    Lightbulb,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Agent Auditor", href: "/dashboard/audit", icon: Sparkles },
    { name: "Battle Arena", href: "/dashboard/battle", icon: Swords },
    { name: "LLM Tracker", href: "/dashboard/llm-tracker", icon: Search },
    { name: "Prompt Research", href: "/dashboard/prompts", icon: Lightbulb },
    { name: "Content Studio", href: "/dashboard/content-studio", icon: FileText },
    { name: "Forum Hub", href: "/dashboard/forum-hub", icon: MessageSquare },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Products", href: "/dashboard/products", icon: Package },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);

    const handleSignOut = async () => {
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } finally {
            router.push("/login");
        }
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen glass flex flex-col transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}
            style={{ borderRight: '1px solid var(--border)' }}
        >
            {/* Logo */}
            <div
                className="flex h-16 items-center justify-between px-4"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            <Zap className="w-4.5 h-4.5 text-white" />
                        </div>
                        <span className="text-lg font-bold font-display text-gradient">
                            Lumina
                        </span>
                    </Link>
                )}
                {collapsed && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
                        <Zap className="w-4.5 h-4.5 text-white" />
                    </div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all"
                >
                    <ChevronLeft
                        className={cn("w-4 h-4 transition-transform duration-200", collapsed && "rotate-180")}
                    />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 relative group",
                                isActive
                                    ? "text-white"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                            )}
                        >
                            {/* Active background pill */}
                            {isActive && (
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/15 to-violet-500/10 border border-indigo-500/20" />
                            )}

                            {/* Active indicator bar */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-indigo-500" />
                            )}

                            <item.icon className={cn(
                                "w-[18px] h-[18px] flex-shrink-0 relative z-10 transition-colors",
                                isActive ? "text-indigo-400" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                            )} />
                            {!collapsed && (
                                <span className="relative z-10">{item.name}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] font-medium",
                        "text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
                    )}
                >
                    <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
