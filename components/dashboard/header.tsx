"use client";

import { useState, useEffect, useRef } from "react";
import {
    Bell, Search, ChevronDown, X,
    TrendingDown, Zap, Flame, Sparkles, Link2, AlertTriangle, Bell as BellDot,
    ShieldAlert, LogOut, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

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

    async function fetchNotifications() {
        try {
            const res = await fetch("/api/alerts/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch {
            // Silently fail
        }
    }

    async function markAllRead() {
        try {
            await fetch("/api/alerts/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {
            // fail silently
        }
    }

    function timeAgo(dateStr: string) {
        const diff = Date.now() - new Date(dateStr).getTime();
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
    };
    const router = useRouter();

    async function handleSignOut() {
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
        } finally {
            router.push("/login");
        }
    }
    async function openNotification(n: Notification) {
        if (!n.read) {
            await fetch("/api/alerts/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [n.id] }),
            }).catch(() => {});
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
            <div className="flex items-center justify-between h-full px-6">
                {/* Title */}
                <div>
                    <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {description}
                        </p>
                    )}
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)] pointer-events-none" />
                        <input
                            placeholder="Search..."
                            className="input-base w-56 h-8 pl-9 pr-3 text-sm transition-all"
                        />
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="relative p-2 rounded-md transition-all text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        >
                            <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center bg-[var(--accent-base)] shadow-[0_0_8px_var(--accent-glow)] px-1">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {showDropdown && (
                            <div className="tooltip absolute right-0 top-11 w-[340px] z-50 animate-fade-in origin-top-right p-0">
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
                                                className="text-[10px] font-medium text-[var(--accent-base)] hover:text-white transition-colors"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowDropdown(false)}
                                            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-80 overflow-y-auto bg-[var(--bg-raised)] rounded-b-md">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-10 text-center">
                                            <Bell className="w-6 h-6 mx-auto mb-3 text-[var(--text-tertiary)]" />
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                No intelligence updates yet
                                            </p>
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => openNotification(n)}
                                                className={`px-4 py-3 transition-colors cursor-pointer border-b border-[var(--border-default)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] ${
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
                                            </div>
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
                            className="flex items-center gap-1.5 p-1 rounded-md transition-all hover:bg-[var(--bg-hover)]"
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
                                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <Settings className="w-4 h-4" /> Settings
                                </Link>
                                <button
                                    onClick={() => { setShowUserMenu(false); handleSignOut(); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--data-red-muted)] hover:text-[var(--data-red)] transition-colors"
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
