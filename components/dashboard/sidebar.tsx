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
    ChevronDown,
    Plus,
    Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Workspace {
    id: string;
    name: string;
    settings?: { website?: string; competitors?: string[] };
    created_at: string;
}

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

    // Workspace switcher state
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const [showWsSwitcher, setShowWsSwitcher] = useState(false);
    const [showNewBrand, setShowNewBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [newBrandWebsite, setNewBrandWebsite] = useState("");
    const [newBrandCompetitors, setNewBrandCompetitors] = useState("");
    const [creating, setCreating] = useState(false);
    const wsRef = useRef<HTMLDivElement>(null);

    // Load workspaces
    useEffect(() => {
        async function load() {
            try {
                // Fetch workspaces and current active workspace in parallel with no caching
                const [wsRes, activeRes] = await Promise.all([
                    fetch("/api/workspaces", { cache: "no-store" }),
                    fetch("/api/onboarding/context", { cache: "no-store" }),
                ]);

                let currentWorkspaceId: string | null = null;
                if (activeRes.ok) {
                    const activeData = await activeRes.json();
                    currentWorkspaceId = activeData.workspaceId || null;
                }

                if (wsRes.ok) {
                    const data = await wsRes.json();
                    const wsList = data.workspaces || [];
                    setWorkspaces(wsList);

                    if (wsList.length > 0) {
                        // Find the workspace that matches the server's active one
                        const activeWs = currentWorkspaceId
                            ? wsList.find((ws: Workspace) => ws.id === currentWorkspaceId)
                            : null;
                        setActiveWorkspace(activeWs || wsList[0]);
                    }
                }
            } catch (e) {
                console.error("Failed to load workspaces:", e);
            }
        }
        load();
    }, []);

    // Click outside to close
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
                setShowWsSwitcher(false);
                setShowNewBrand(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    async function switchWorkspace(ws: Workspace) {
        setActiveWorkspace(ws);
        setShowWsSwitcher(false);
        try {
            const res = await fetch("/api/workspaces/switch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: ws.id }),
            });
            // Wait for the response to fully resolve (cookie is set)
            await res.json();
            // Small delay to ensure cookie is persisted
            await new Promise(resolve => setTimeout(resolve, 100));
            // Full page reload to refresh all server components with new workspace
            window.location.href = "/dashboard";
        } catch (e) {
            console.error("Failed to switch workspace:", e);
        }
    }

    async function createBrand() {
        if (!newBrandName.trim()) return;
        setCreating(true);
        try {
            const competitors = newBrandCompetitors
                .split(",")
                .map(c => c.trim())
                .filter(Boolean);

            const res = await fetch("/api/workspaces", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newBrandName.trim(),
                    website: newBrandWebsite.trim() || undefined,
                    competitors,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const newWs = data.workspace;
                setWorkspaces(prev => [...prev, newWs]);
                setNewBrandName("");
                setNewBrandWebsite("");
                setNewBrandCompetitors("");
                setShowNewBrand(false);
                // Switch to the new workspace
                await switchWorkspace(newWs);
            }
        } catch (e) {
            console.error("Failed to create brand:", e);
        } finally {
            setCreating(false);
        }
    }

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

            {/* Workspace Switcher */}
            {!collapsed && (
                <div className="px-3 py-2 border-b border-[var(--border-subtle)] relative" ref={wsRef}>
                    <button
                        onClick={() => setShowWsSwitcher(!showWsSwitcher)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] transition-colors text-left"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-base)] text-[10px] font-bold flex-shrink-0">
                                {(activeWorkspace?.name || "B")[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                {activeWorkspace?.name || "Select Brand"}
                            </span>
                        </div>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform", showWsSwitcher && "rotate-180")} />
                    </button>

                    {/* Dropdown */}
                    {showWsSwitcher && (
                        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden">
                            <div className="p-1 max-h-48 overflow-y-auto">
                                {workspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => switchWorkspace(ws)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                            activeWorkspace?.id === ws.id
                                                ? "bg-[var(--accent-muted)] text-[var(--text-primary)]"
                                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
                                                {ws.name[0].toUpperCase()}
                                            </div>
                                            <span className="truncate">{ws.name}</span>
                                        </div>
                                        {activeWorkspace?.id === ws.id && (
                                            <Check className="w-3.5 h-3.5 text-[var(--accent-base)]" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="border-t border-[var(--border-default)] p-1">
                                {showNewBrand ? (
                                    <div className="p-2 space-y-2">
                                        <input
                                            autoFocus
                                            placeholder="Brand name *"
                                            value={newBrandName}
                                            onChange={(e) => setNewBrandName(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-base)]"
                                        />
                                        <input
                                            placeholder="Website (e.g. example.com)"
                                            value={newBrandWebsite}
                                            onChange={(e) => setNewBrandWebsite(e.target.value)}
                                            className="w-full px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-base)]"
                                        />
                                        <input
                                            placeholder="Competitors (comma-separated)"
                                            value={newBrandCompetitors}
                                            onChange={(e) => setNewBrandCompetitors(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && createBrand()}
                                            className="w-full px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-base)]"
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={createBrand}
                                                disabled={!newBrandName.trim() || creating}
                                                className="flex-1 px-2 py-1.5 rounded bg-[var(--accent-base)] text-white text-xs font-medium disabled:opacity-40"
                                            >
                                                {creating ? "Creating..." : "Create Brand"}
                                            </button>
                                            <button
                                                onClick={() => { setShowNewBrand(false); setNewBrandName(""); setNewBrandWebsite(""); setNewBrandCompetitors(""); }}
                                                className="px-2 py-1.5 rounded bg-[var(--bg-surface)] text-[var(--text-secondary)] text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowNewBrand(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--accent-base)] hover:bg-[var(--accent-muted)] transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Brand
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
