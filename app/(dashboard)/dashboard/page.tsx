"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/dashboard/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
    Eye,
    MessageSquare,
    TrendingUp,
    FileText,
    ArrowRight,
    Zap,
    Search,
    BarChart3,
    AlertCircle,
    Radio,
    Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface DashboardStats {
    aeloHealthScore: number;
    aeloScoreChange: number;
    llmVisibility: number;
    llmVisibilityChange: number;
    forumThreadCount: number;
    highPriorityThreads: number;
    shareOfVoice: number;
    shareOfVoiceChange: number;
    contentScore: number;
    pagesNeedingOptimization: number;
}

interface RecentMention {
    id: string;
    platform: string;
    prompt: string;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    createdAt: string;
}

interface ForumThread {
    id: string;
    title: string;
    subreddit: string | null;
    opportunity_score: number;
    platform: string;
    status: string;
    created_at: string;
}

interface AnalyticsData {
    totalVisits: number;
    aiVisits: number;
    sources: Record<string, number>;
}

interface DashboardData {
    stats: DashboardStats;
    recentMentions: RecentMention[];
    visibilityMetrics: Array<{
        platform: string;
        score: number;
        change: number;
        scanCount: number;
    }>;
    analytics?: AnalyticsData;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);

    // Derived state for easy access in UI
    const analytics = data?.analytics;

    const fetchData = useCallback(async () => {
        try {
            setError(null);

            const [statsRes, threadsRes, analyticsRes] = await Promise.all([
                fetch('/api/dashboard/stats', { cache: 'no-store' }),
                fetch('/api/forum/threads?limit=3&minScore=50', { cache: 'no-store' }),
                fetch('/api/analytics/summary', { cache: 'no-store' }),
            ]);

            if (!statsRes.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }

            const statsData = await statsRes.json();

            let analyticsData = null;
            if (analyticsRes.ok) {
                analyticsData = await analyticsRes.json();
            }

            setData({ ...statsData, analytics: analyticsData });

            if (threadsRes.ok) {
                const threadsData = await threadsRes.json();
                setThreads(threadsData.threads || []);
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
    }, []);

    // Initial data fetch and setup realtime subscriptions
    useEffect(() => {
        async function initialFetch() {
            setLoading(true);
            await fetchData();
            setLoading(false);
            setIsLive(true);
        }
        initialFetch();

        // Setup Supabase Realtime subscriptions
        const supabase = createClient();

        const llmChannel = supabase
            .channel('dashboard-llm-scans')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'llm_scans' },
                () => {
                    // Refetch data when new scan is added
                    fetchData();
                }
            )
            .subscribe();

        const forumChannel = supabase
            .channel('dashboard-forum-threads')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'forum_threads' },
                () => {
                    // Refetch data when threads change
                    fetchData();
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(llmChannel);
            supabase.removeChannel(forumChannel);
        };
    }, [fetchData]);

    if (loading) {
        return (
            <>
                <Header
                    title="Dashboard"
                    description="Your Aelo performance at a glance"
                />
                <DashboardSkeleton />
            </>
        );
    }

    if (error) {
        return (
            <>
                <Header
                    title="Dashboard"
                    description="Your Aelo performance at a glance"
                />
                <div className="p-6">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 flex items-center gap-4">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-400">Error Loading Dashboard</h3>
                            <p className="text-[var(--text-secondary)]">{error}</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => window.location.reload()}
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const stats = data?.stats || {
        aeloHealthScore: 0,
        aeloScoreChange: 0,
        llmVisibility: 0,
        llmVisibilityChange: 0,
        forumThreadCount: 0,
        highPriorityThreads: 0,
        shareOfVoice: 0,
        shareOfVoiceChange: 0,
        contentScore: 0,
        pagesNeedingOptimization: 0,
    };

    const recentMentions = data?.recentMentions || [];

    const getIntentType = (thread: ForumThread): string => {
        const title = thread.title.toLowerCase();
        if (title.includes('vs') || title.includes('compare') || title.includes('comparison')) {
            return '🆚 Compare';
        }
        if (title.includes('buy') || title.includes('recommend') || title.includes('best') || title.includes('under')) {
            return '🛒 Buying';
        }
        return '💡 Research';
    };

    return (
        <>
            <Header
                title="Dashboard"
                description="Your Aelo performance at a glance"
            />

            <div className="p-6 space-y-6">
                {/* Live indicator */}
                {isLive && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Live updates enabled</span>
                    </div>
                )}

                {/* Aelo Health Score */}
                <div
                    className="rounded-lg p-6 relative overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, var(--accent-muted), var(--bg-base))",
                        border: "1px solid rgba(99,102,241,0.2)",
                    }}
                >
                    {/* Top gradient accent */}
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{ background: "linear-gradient(90deg, transparent, var(--accent-base), var(--data-teal), transparent)" }}
                    />
                    <div className="flex items-center justify-between">
                        <div>
                            <p
                                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                Aelo Health Score
                            </p>
                            <div className="flex items-baseline gap-3">
                                <span
                                    className="text-6xl font-bold tracking-tight"
                                    style={{
                                        background: "linear-gradient(135deg, #FAFAFA, var(--accent-hover))",
                                        WebkitBackgroundClip: "text",
                                        WebkitTextFillColor: "transparent",
                                        backgroundClip: "text",
                                    }}
                                >
                                    {stats.aeloHealthScore}
                                </span>
                                <span className="text-xl" style={{ color: "var(--text-tertiary)" }}>/100</span>
                                {stats.aeloScoreChange !== 0 && (
                                    <Badge variant={stats.aeloScoreChange > 0 ? "success" : "destructive"}>
                                        {stats.aeloScoreChange > 0 ? "+" : ""}{stats.aeloScoreChange} this week
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                                {stats.aeloHealthScore === 0
                                    ? "Run your first LLM scan to start tracking visibility"
                                    : stats.aeloScoreChange > 0
                                        ? "Your brand visibility across AI platforms is improving"
                                        : "Monitor and optimize your AI presence"
                                }
                            </p>
                        </div>
                        <div className="hidden md:flex items-center justify-center">
                            {/* Orbital glow ring */}
                            <div
                                className="relative w-28 h-28 flex items-center justify-center"
                                style={{ filter: "drop-shadow(0 0 16px var(--accent-glow))" }}
                            >
                                <svg width="112" height="112" viewBox="0 0 112 112" className="absolute">
                                    {/* Track */}
                                    <circle cx="56" cy="56" r="48" fill="none" stroke="var(--accent-muted)" strokeWidth="6" />
                                    {/* Progress */}
                                    <circle
                                        cx="56" cy="56" r="48"
                                        fill="none"
                                        stroke="url(#ring-grad)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(stats.aeloHealthScore / 100) * 301.6} 301.6`}
                                        transform="rotate(-90 56 56)"
                                    />
                                    <defs>
                                        <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="var(--accent-base)" />
                                            <stop offset="100%" stopColor="var(--data-teal)" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center z-10"
                                    style={{ background: "var(--bg-base)" }}
                                >
                                    <Zap className="w-7 h-7" style={{ color: "var(--accent-hover)" }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="LLM Visibility"
                        value={`${stats.llmVisibility}%`}
                        change={stats.llmVisibilityChange !== 0
                            ? `${stats.llmVisibilityChange > 0 ? '↑' : '↓'} ${Math.abs(stats.llmVisibilityChange)}% from last scan`
                            : "No change"
                        }
                        changeType={stats.llmVisibilityChange > 0 ? "positive" : stats.llmVisibilityChange < 0 ? "negative" : "neutral"}
                        icon={Eye}
                        accentColor="violet"
                    />
                    <MetricCard
                        title="Forum Threads"
                        value={stats.forumThreadCount.toString()}
                        change={`${stats.highPriorityThreads} high-priority opportunities`}
                        changeType="neutral"
                        icon={MessageSquare}
                        accentColor="cyan"
                    />
                    <MetricCard
                        title="Share of Voice"
                        value={`${stats.shareOfVoice}%`}
                        change={stats.shareOfVoiceChange !== 0
                            ? `${stats.shareOfVoiceChange > 0 ? '↑' : '↓'} ${Math.abs(stats.shareOfVoiceChange)}% vs competitors`
                            : "Track competitors to enable"
                        }
                        changeType={stats.shareOfVoiceChange > 0 ? "positive" : "neutral"}
                        icon={TrendingUp}
                        accentColor="emerald"
                    />
                    <MetricCard
                        title="Content Score"
                        value={stats.contentScore.toString()}
                        change={stats.pagesNeedingOptimization > 0
                            ? `${stats.pagesNeedingOptimization} pages need optimization`
                            : "All content optimized"
                        }
                        changeType="neutral"
                        icon={FileText}
                        accentColor="amber"
                    />
                </div>

                {/* AI Buyer Journey */}
                {analytics && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                AI Buyer Journey
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="md:col-span-1 border-r border-[var(--border-default)] pr-6">
                                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">AI-Driven Visits</p>
                                    <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{analytics.aiVisits}</p>
                                    <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                                        Last 30 days • {analytics.totalVisits > 0
                                            ? `${((analytics.aiVisits / analytics.totalVisits) * 100).toFixed(1)}% of total traffic`
                                            : "No traffic data yet"}
                                    </div>
                                    <div className="mt-4 p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                        <p className="text-xs text-[var(--text-secondary)]">
                                            Add the <code>&lt;script&gt;</code> tag to your site to track this.
                                        </p>
                                    </div>
                                </div>
                                <div className="md:col-span-3">
                                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">Traffic by AI Source</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {['chatgpt', 'gemini', 'perplexity', 'claude'].map(source => (
                                            <div key={source} className="bg-[var(--bg-raised)] rounded-lg p-4 border border-[var(--border-default)]">
                                                <p className="text-xs text-[var(--text-secondary)] capitalize mb-2">{source}</p>
                                                <div className="flex items-end justify-between">
                                                    <span className="text-xl font-bold text-[var(--text-primary)]">{analytics.sources[source] || 0}</span>
                                                    <div className="h-1 w-10 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${Math.min(100, ((analytics.sources[source] || 0) / (analytics.aiVisits || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent LLM Mentions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Recent LLM Mentions</CardTitle>
                            <Link href="/dashboard/llm-tracker">
                                <Button variant="ghost" size="sm">
                                    View all <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {recentMentions.length > 0 ? (
                                recentMentions.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)] hover:border-[var(--border-hover)] border border-transparent transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center">
                                                <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{item.prompt}</p>
                                                <p className="text-xs text-[var(--text-tertiary)]">
                                                    {item.platform} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                        {item.sentiment && (
                                            <Badge variant={item.sentiment === "positive" ? "success" : "outline"}>
                                                {item.sentiment}
                                            </Badge>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[var(--text-tertiary)]">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No LLM mentions yet</p>
                                    <Link href="/dashboard/llm-tracker">
                                        <Button variant="outline" className="mt-3" size="sm">
                                            Run your first scan
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hot Forum Opportunities */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Hot Forum Opportunities</CardTitle>
                            <Link href="/dashboard/forum-hub">
                                <Button variant="ghost" size="sm">
                                    View all <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {threads.length > 0 ? (
                                threads.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)] hover:border-[var(--border-hover)] border border-transparent transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center text-xs font-bold font-mono text-[var(--text-secondary)]">
                                                {item.opportunity_score}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">{item.title}</p>
                                                <p className="text-xs text-[var(--text-tertiary)]">
                                                    {item.platform === 'reddit' && item.subreddit ? `r/${item.subreddit}` : item.platform} • {getIntentType(item)}
                                                </p>
                                            </div>
                                        </div>
                                        {item.opportunity_score >= 80 && (
                                            <Badge variant="warning">🔥 HOT</Badge>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[var(--text-tertiary)]">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No forum threads discovered yet</p>
                                    <Link href="/dashboard/forum-hub">
                                        <Button variant="outline" className="mt-3" size="sm">
                                            Discover threads
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link href="/dashboard/llm-tracker">
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                                    <Search className="w-5 h-5" />
                                    <span>Run LLM Scan</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/forum-hub">
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                                    <MessageSquare className="w-5 h-5" />
                                    <span>Find Threads</span>
                                </Button>
                            </Link>
                            <Link href="/dashboard/analytics">
                                <Button variant="outline" className="h-auto py-4 flex-col gap-2 w-full">
                                    <BarChart3 className="w-5 h-5" />
                                    <span>View Analytics</span>
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
