"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    TrendingDown,
    Grid3x3,
    ShieldCheck,
    Lock,
    Target,
    Bot,
    X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { authClient } from "@/lib/auth-client";
import { AeloMark, AeloWordmark } from "@/components/brand/logo";
import { useDashboardBootstrap } from "@/components/onboarding-check";

interface Workspace {
    id: string;
    name: string;
    settings?: { website?: string; competitors?: string[] };
    created_at: string;
}

const primaryNav = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Prompts & Scans", href: "/dashboard/llm-tracker", icon: Search },
    { name: "Sources", href: "/dashboard/sources", icon: BarChart3 },
    { name: "Actions", href: "/dashboard/interventions", icon: Target },
    { name: "Reports & Settings", href: "/dashboard/report", icon: FileText },
];

const legacyNav = [
            { name: "LLM Tracker", href: "/dashboard/llm-tracker", icon: Search },
            { name: "Agent Auditor", href: "/dashboard/audit", icon: Sparkles },
            { name: "Battle Arena", href: "/dashboard/battle", icon: Swords },
            { name: "Positioning", href: "/dashboard/positioning", icon: Grid3x3, premium: true },
            { name: "Question Mine", href: "/dashboard/question-mine", icon: HelpCircle },
            { name: "Prompt Research", href: "/dashboard/prompts", icon: Lightbulb },
            { name: "Content Studio", href: "/dashboard/content-studio", icon: FileText },
            { name: "Forum Hub", href: "/dashboard/forum-hub", icon: MessageSquare },
            { name: "Playbook", href: "/dashboard/playbook", icon: BookOpen },
            { name: "Experiments", href: "/dashboard/experiments", icon: FlaskConical },
            { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
            { name: "Sentiment Drift", href: "/dashboard/drift", icon: TrendingDown, premium: true },
            { name: "AI Crawlers", href: "/dashboard/crawlers", icon: Bot },
            { name: "Attribution", href: "/dashboard/attribution", icon: Users },
            { name: "Accuracy Verdict", href: "/dashboard/accuracy", icon: ShieldCheck, premium: true },
            { name: "Legacy Insights URL", href: "/dashboard/insights", icon: Check },
            { name: "Client Report", href: "/dashboard/report", icon: FileText },
            { name: "Products", href: "/dashboard/products", icon: Package },
            { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({
    collapsed,
    mobileOpen,
    onCollapsedChange,
    onMobileClose,
    returnFocusRef,
    drawerOnly = false,
}: {
    collapsed: boolean;
    mobileOpen: boolean;
    onCollapsedChange: (collapsed: boolean) => void;
    onMobileClose: () => void;
    returnFocusRef: RefObject<HTMLButtonElement | null>;
    drawerOnly?: boolean;
}) {
    const pathname = usePathname();
    const bootstrap = useDashboardBootstrap();
    const [showMoreTools, setShowMoreTools] = useState(false);
    // null = unknown (avoid flashing a lock before we know the plan)
    const paid = bootstrap?.paid ?? null;

    // Workspace switcher state
    const [workspaces, setWorkspaces] = useState<Workspace[]>(bootstrap?.workspaces ?? []);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(() =>
        bootstrap?.workspaces.find((workspace) => workspace.id === bootstrap.workspaceId) ?? bootstrap?.workspaces[0] ?? null);
    const [showWsSwitcher, setShowWsSwitcher] = useState(false);
    const [showNewBrand, setShowNewBrand] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [newBrandWebsite, setNewBrandWebsite] = useState("");
    const [newBrandCompetitors, setNewBrandCompetitors] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const wsRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousPathnameRef = useRef(pathname);

    useEffect(() => {
        if (!mobileOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                onMobileClose();
                returnFocusRef.current?.focus();
                return;
            }
            if (event.key !== "Tab" || !sidebarRef.current) return;
            const focusable = [...sidebarRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [mobileOpen, onMobileClose, returnFocusRef]);

    useEffect(() => {
        if (previousPathnameRef.current === pathname) return;
        previousPathnameRef.current = pathname;
        if (!mobileOpen) return;
        const timer = window.setTimeout(onMobileClose, 0);
        return () => window.clearTimeout(timer);
    }, [mobileOpen, onMobileClose, pathname]);

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
            window.location.assign("/dashboard");
        } catch (e) {
            console.error("Failed to switch workspace:", e);
        }
    }

    async function createBrand() {
        if (!newBrandName.trim()) return;
        setCreating(true);
        setCreateError(null);
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
            } else {
                const data = await res.json();
                setCreateError(data.error || "Failed to create brand");
            }
        } catch (e) {
            console.error("Failed to create brand:", e);
            setCreateError("A network error occurred. Please try again.");
        } finally {
            setCreating(false);
        }
    }

    const handleSignOut = async () => {
        try {
            const { error } = await authClient.signOut();
            if (error) throw new Error(error.message || 'Unable to sign out.');
        } catch {
            // ignore; force the redirect regardless
        }
        // Hard navigation so the server + middleware re-evaluate with cookies cleared.
        window.location.assign("/login");
    };

    return (<>
        {mobileOpen && <button type="button" aria-label="Close navigation" className={cn("fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]", !drawerOnly && "lg:hidden")} onClick={() => { onMobileClose(); returnFocusRef.current?.focus(); }} />}
        <aside
            ref={sidebarRef}
            role={mobileOpen ? "dialog" : undefined}
            aria-modal={mobileOpen ? "true" : undefined}
            aria-label="Product navigation"
            className={cn(
                "fixed left-0 top-0 z-50 flex h-dvh w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-base)] transition-transform duration-200",
                !drawerOnly && "lg:z-40 lg:h-screen lg:translate-x-0 lg:transition-[width]",
                mobileOpen ? "translate-x-0" : "-translate-x-full",
                !drawerOnly && (collapsed ? "lg:w-16" : "lg:w-60")
            )}
        >
            {/* Logo */}
            <div className="flex h-14 items-center justify-between px-4 flex-shrink-0 border-b border-[var(--border-subtle)]">
                {!collapsed && (
                    <Link href="/dashboard" className="group" onClick={onMobileClose}>
                        <AeloWordmark size="md" />
                    </Link>
                )}

                {collapsed && (
                    <div className="flex items-center justify-center mx-auto text-[var(--text-primary)]">
                        <AeloMark size={20} />
                    </div>
                )}

                <button ref={closeButtonRef} onClick={() => { onMobileClose(); returnFocusRef.current?.focus(); }} aria-label="Close navigation" className={cn("flex min-h-11 min-w-11 items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]", !drawerOnly && "lg:hidden")}><X className="h-5 w-5" /></button>
                <button onClick={() => onCollapsedChange(!collapsed)} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className={cn("hidden min-h-10 min-w-10 flex-shrink-0 items-center justify-center text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]", !drawerOnly && "lg:flex")}>
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
                                        {createError && (
                                            <div className="p-2 text-xs text-[var(--data-red)] bg-[var(--data-red)]/10 rounded border border-[var(--data-red)]/25">
                                                {createError}
                                            </div>
                                        )}
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
            <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4" aria-label="Product">
                <div>
                    {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-ghost)]">Workspace</p>}
                    <div className="space-y-0.5">
                        {primaryNav.map((item) => {
                            const pathHref = item.href.split('#')[0];
                            const isActive = pathname === pathHref || (pathHref !== "/dashboard" && pathname.startsWith(pathHref + "/"));
                            return <Link key={item.name} href={item.href} onClick={onMobileClose} title={collapsed ? item.name : undefined} className={cn("nav-item min-h-10", isActive && "active", collapsed && "justify-center px-0 w-10 h-10 mx-auto gap-0")}>
                                <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />{!collapsed && <span>{item.name}</span>}
                            </Link>;
                        })}
                    </div>
                </div>
                <div>
                    <button type="button" aria-expanded={showMoreTools} onClick={() => setShowMoreTools(value => !value)} className={cn("nav-item min-h-10 w-full", collapsed && "justify-center px-0 w-10 h-10 mx-auto gap-0")} title={collapsed ? "More tools" : undefined}>
                        <Grid3x3 className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                        {!collapsed && <><span>More tools</span><ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showMoreTools && "rotate-180")} /></>}
                    </button>
                    {showMoreTools && <div className="mt-1 space-y-0.5 border-l border-[var(--border-subtle)] pl-2">
                        {legacyNav.map((item) => {
                                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onMobileClose}
                                        title={collapsed ? item.name : undefined}
                                        className={cn(
                                            "nav-item",
                                            isActive && "active",
                                            collapsed && "justify-center px-0 w-10 h-10 mx-auto gap-0"
                                        )}
                                    >
                                        <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
                                        {!collapsed && <span>{item.name}</span>}
                                        {!collapsed && "premium" in item && item.premium && paid === false && (
                                            <Lock
                                                className="w-3 h-3 ml-auto flex-shrink-0 text-[var(--text-ghost)]"
                                                strokeWidth={2}
                                            />
                                        )}
                                    </Link>
                                );
                        })}
                    </div>}
                </div>
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
    </>);
}
