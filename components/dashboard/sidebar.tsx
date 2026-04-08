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
    Sparkles,
    Swords,
    Lightbulb,
    FlaskConical,
    HelpCircle,
    BookOpen,
    Users,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navGroups = [
    {
        label: "Overview",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        label: "Analyze",
        items: [
            { name: "LLM Tracker", href: "/dashboard/llm-tracker", icon: Search },
            { name: "Agent Auditor", href: "/dashboard/audit", icon: Sparkles },
            { name: "Battle Arena", href: "/dashboard/battle", icon: Swords },
            { name: "Question Mine", href: "/dashboard/question-mine", icon: HelpCircle },
            { name: "Prompt Research", href: "/dashboard/prompts", icon: Lightbulb },
        ],
    },
    {
        label: "Grow",
        items: [
            { name: "Content Studio", href: "/dashboard/content-studio", icon: FileText },
            { name: "Forum Hub", href: "/dashboard/forum-hub", icon: MessageSquare },
            { name: "Playbook", href: "/dashboard/playbook", icon: BookOpen },
            { name: "Experiments", href: "/dashboard/experiments", icon: FlaskConical },
        ],
    },
    {
        label: "Measure",
        items: [
            { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
            { name: "Attribution", href: "/dashboard/attribution", icon: Users },
        ],
    },
    {
        label: "Workspace",
        items: [
            { name: "Products", href: "/dashboard/products", icon: Package },
            { name: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
    },
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
                "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-200 bg-[var(--bg-base)] border-r border-[var(--border-subtle)]",
                collapsed ? "w-16" : "w-60"
            )}
        >
            {/* Logo */}
            <div className="flex h-14 items-center justify-between px-4 flex-shrink-0 border-b border-[var(--border-subtle)]">
                {!collapsed && (
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 22h20L12 2z" className="fill-[var(--accent-base)]" />
                            <path d="M12 9L7 19h10L12 9z" className="fill-[var(--bg-base)]" />
                        </svg>
                        <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                            Aelo
                        </span>
                    </Link>
                )}

                {collapsed && (
                    <div className="flex items-center justify-center mx-auto">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 22h20L12 2z" className="fill-[var(--accent-base)]" />
                            <path d="M12 9L7 19h10L12 9z" className="fill-[var(--bg-base)]" />
                        </svg>
                    </div>
                )}

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                >
                    <ChevronLeft className={cn("w-4 h-4 transition-transform duration-200", collapsed && "rotate-180")} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        {!collapsed && (
                            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-ghost)]">
                                {group.label}
                            </p>
                        )}
                        {collapsed && (
                            <div className="mx-auto my-2 h-px w-6 bg-[var(--border-subtle)]" />
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        title={collapsed ? item.name : undefined}
                                        className={cn(
                                            "nav-item",
                                            isActive && "active",
                                            collapsed && "justify-center px-0 w-10 h-10 mx-auto gap-0"
                                        )}
                                    >
                                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                                        {!collapsed && <span>{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Sign Out */}
            <div className="p-3 border-t border-[var(--border-subtle)]">
                <button
                    onClick={handleSignOut}
                    className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all text-[var(--text-secondary)] hover:text-[var(--data-red)] hover:bg-[var(--data-red-muted)] text-[13px] font-medium",
                        collapsed && "justify-center px-0 w-10 h-10 mx-auto"
                    )}
                >
                    <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
