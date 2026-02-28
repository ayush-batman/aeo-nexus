"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, ChevronDown, X } from "lucide-react";

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
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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

    return (
        <header className="h-14 glass sticky top-0 z-30" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between h-full px-6">
                {/* Title */}
                <div>
                    <h1 className="text-lg font-semibold font-display text-[var(--text-primary)] tracking-tight">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-xs text-[var(--text-muted)] -mt-0.5">{description}</p>
                    )}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-ghost)]" />
                        <input
                            placeholder="Search..."
                            className="w-56 h-8 pl-9 pr-3 text-xs rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] placeholder-[var(--text-ghost)] focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>

                    {/* Notifications */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-indigo-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 shadow-lg shadow-indigo-500/30">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 top-11 w-80 glass-subtle rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-fade-in">
                                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <span className="text-xs font-semibold text-[var(--text-primary)]">Notifications</span>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead} className="text-[10px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <Bell className="w-6 h-6 mx-auto mb-2 text-[var(--text-ghost)]" />
                                            <p className="text-xs text-[var(--text-muted)]">No notifications yet</p>
                                        </div>
                                    ) : (
                                        notifications.slice(0, 10).map((n) => (
                                            <div
                                                key={n.id}
                                                className={`px-4 py-2.5 transition-colors ${!n.read ? 'bg-indigo-500/5' : 'hover:bg-[var(--surface)]'}`}
                                                style={{ borderBottom: '1px solid var(--border)' }}
                                            >
                                                <p className="text-xs font-medium text-[var(--text-primary)]">{n.title}</p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{n.message}</p>
                                                <p className="text-[10px] text-[var(--text-ghost)] mt-1 font-mono">{timeAgo(n.created_at)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User avatar */}
                    <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--surface)] transition-all">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold shadow-lg shadow-indigo-500/20">
                            U
                        </div>
                        <ChevronDown className="w-3 h-3 text-[var(--text-ghost)]" />
                    </button>
                </div>
            </div>
        </header>
    );
}
