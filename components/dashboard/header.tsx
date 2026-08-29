"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Bell, ChevronDown, X, Menu,
    TrendingDown, Zap, Flame, Sparkles, Link2, AlertTriangle, Bell as BellDot,
    ShieldAlert, LogOut, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useDashboardShell } from "@/components/dashboard/dashboard-shell";

interface HeaderProps {
    title: string;
    description?: string;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

export function Header({ title, description }: HeaderProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notificationError, setNotificationError] = useState<string | null>(null);
    const [notificationClock, setNotificationClock] = useState(0);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const { openNavigation, navigationButtonRef } = useDashboardShell();

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/alerts/notifications", { cache: "no-store" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Notifications could not be loaded.");
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
            setNotificationClock(Date.now());
            setNotificationError(null);
        } catch (error) {
            setNotificationError(error instanceof Error ? error.message : "Notifications could not be loaded.");
        }
    }, []);

    useEffect(() => {
        const initial = window.setTimeout(() => { void fetchNotifications(); }, 0);
        const interval = window.setInterval(() => { void fetchNotifications(); }, 60000);
        return () => { window.clearTimeout(initial); window.clearInterval(interval); };
    }, [fetchNotifications]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function markAllRead() {
        try {
            const response = await fetch("/api/alerts/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            if (!response.ok) throw new Error("Notifications could not be updated.");
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
            setNotificationError(null);
        } catch (error) {
            setNotificationError(error instanceof Error ? error.message : "Notifications could not be updated.");
        }
    }

    function timeAgo(dateStr: string) {
        const diff = Math.max(0, notificationClock - new Date(dateStr).getTime());
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    }

    // Notification type → thin-stroke icon. Sage: instruments, not emoji.
    const notifTypeIcon: Record<string, LucideIcon> = {
        visibility_drop:     TrendingDown,
        competitor_overtake: Zap,
        hot_thread:          Flame,
        new_citation:        Sparkles,
        citation_lost:       Link2,
        negative_sentiment:  AlertTriangle,
        sentiment_drift:     TrendingDown,
        accuracy_alert:      ShieldAlert,
        weekly_digest_failed: AlertTriangle,
    };
    const notifTypeColor: Record<string, string> = {
        visibility_drop:     "text-[var(--data-red)]",
        competitor_overtake: "text-[var(--data-amber)]",
        hot_thread:          "text-[var(--data-amber)]",
        new_citation:        "text-[var(--accent-base)]",
        citation_lost:       "text-[var(--text-tertiary)]",
        negative_sentiment:  "text-[var(--data-red)]",
        sentiment_drift:     "text-[var(--data-amber)]",
        accuracy_alert:      "text-[var(--data-red)]",
        weekly_digest_failed: "text-[var(--data-red)]",
    };
    const notifTypeHref: Record<string, string> = {
        sentiment_drift:     "/dashboard/drift",
        accuracy_alert:      "/dashboard/accuracy",
        visibility_drop:     "/dashboard/llm-tracker",
        competitor_overtake: "/dashboard/battle",
        hot_thread:          "/dashboard/forum-hub",
        new_citation:        "/dashboard/attribution",
        citation_lost:       "/dashboard/attribution",
        negative_sentiment:  "/dashboard/drift",
        weekly_digest_failed: "/dashboard",
    };
    const router = useRouter();

    async function handleSignOut() {
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } catch {
            // ignore; force the redirect regardless
        }
        // Hard navigation so the server + middleware re-evaluate with cookies cleared.
        // router.push() is a soft nav and leaves the stale session, so logout "does nothing".
        window.location.assign("/login");
    }
    async function openNotification(n: Notification) {
        if (!n.read) {
            const response = await fetch("/api/alerts/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [n.id] }),
            });
            if (!response.ok) {
                setNotificationError("This notification could not be marked as read.");
                return;
            }
            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        const href = notifTypeHref[n.type];
        if (href) {
            setShowDropdown(false);
            router.push(href);
        }
    }

    return (
        <header className="h-14 sticky top-0 z-30 bg-[rgba(0,0,0,0.8)] border-b border-[var(--border-subtle)] backdrop-blur-xl">
            <div className="flex items-center justify-between h-full gap-3 px-3 sm:px-6">
                {/* Title */}
                <div className="flex min-w-0 items-center gap-2.5">
                    <button ref={navigationButtonRef} type="button" onClick={openNavigation} aria-label="Open navigation" className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] lg:hidden">
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                    <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="hidden truncate text-xs text-[var(--text-secondary)] mt-0.5 sm:block">
                            {description}
                        </p>
                    )}
                    </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-3">
                    {/* Notifications */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            aria-label="Notifications"
                            aria-expanded={showDropdown}
                            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        >
                            <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center bg-[var(--accent-base)] shadow-[0_0_8px_var(--accent-glow)] px-1">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {showDropdown && (
                            <div className="tooltip absolute right-0 top-11 z-50 w-[min(340px,calc(100vw-1.5rem))] animate-fade-in origin-top-right p-0">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] rounded-t-md">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                                            NOTIFICATIONS
                                        </span>
                                        {unreadCount > 0 && (
                                            <span className="badge badge-violet">
                                                {unreadCount} new
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllRead}
                                                className="min-h-10 px-2 text-[10px] font-medium text-[var(--accent-base)] hover:text-white transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowDropdown(false)}
                                            aria-label="Close notifications"
                                            className="flex min-h-10 min-w-10 items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-80 overflow-y-auto bg-[var(--bg-raised)] rounded-b-md">
                                    {notificationError ? (
                                        <div role="alert" className="px-4 py-6 text-center"><p className="text-xs text-[var(--data-red)]">{notificationError}</p><button type="button" onClick={() => void fetchNotifications()} className="mt-3 min-h-10 px-3 text-xs text-[var(--accent-base)]">Retry</button></div>
                                    ) : notifications.length === 0 ? (
                                        <div className="px-4 py-10 text-center">
                                            <Bell className="w-6 h-6 mx-auto mb-3 text-[var(--text-tertiary)]" />
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                No intelligence updates yet
                                            </p>
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((n) => (
                                            <button
                                                type="button"
                                                key={n.id}
                                                onClick={() => openNotification(n)}
                                                className={`w-full min-h-11 px-4 py-3 text-left transition-colors cursor-pointer border-b border-[var(--border-default)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] ${
                                                    !n.read ? "border-l-2 border-l-[var(--accent-base)]" : ""
                                                }`}
                                                style={!n.read ? { backgroundColor: 'color-mix(in srgb, var(--accent-base) 6%, transparent)' } : undefined}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className={`mt-0.5 ${notifTypeColor[n.type] ?? "text-[var(--text-tertiary)]"}`}>
                                                        {(() => {
                                                            const Ico = notifTypeIcon[n.type] ?? BellDot;
                                                            return <Ico className="h-3.5 w-3.5" strokeWidth={1.75} />;
                                                        })()}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium truncate text-[var(--text-primary)]">
                                                            {n.title}
                                                        </p>
                                                        <p className="text-[12px] mt-1 leading-relaxed text-[var(--text-secondary)]">
                                                            {n.message}
                                                        </p>
                                                        <p className="text-[10px] mt-1.5 font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                                                            {timeAgo(n.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User avatar + menu */}
                    <div className="relative ml-1" ref={userMenuRef}>
                        <button
                            onClick={() => setShowUserMenu((v) => !v)}
                            aria-label="Account menu"
                            aria-expanded={showUserMenu}
                            className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                        >
                            <div className="w-7 h-7 rounded-md bg-[var(--accent-base)] flex items-center justify-center text-white text-xs font-semibold">
                               U
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform ${showUserMenu ? "rotate-180" : ""}`} />
                        </button>
                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 z-50 rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] shadow-lg overflow-hidden py-1">
                                <Link
                                    href="/dashboard/settings"
                                    onClick={() => setShowUserMenu(false)}
                                    className="flex min-h-11 items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <Settings className="w-4 h-4" /> Settings
                                </Link>
                                <button
                                    onClick={() => { setShowUserMenu(false); handleSignOut(); }}
                                    className="min-h-11 w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--data-red-muted)] hover:text-[var(--data-red)] transition-colors"
                                >
                                    <LogOut className="w-4 h-4" /> Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
