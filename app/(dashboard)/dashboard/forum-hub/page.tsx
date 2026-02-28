"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getScoreColor, getPriorityLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
    MessageSquare,
    Search,
    RefreshCw,
    ExternalLink,
    Sparkles,
    Copy,
    Check,
    ThumbsUp,
    MessageCircle,
    Clock,
    AlertCircle,
    Radio,
    Radar,
    Settings,
    Globe,
    Code,
    Flame,
    Youtube,
    HelpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ForumThread {
    id: string;
    title: string;
    platform: string;
    subreddit: string | null;
    url: string;
    score: number;
    num_comments: number;
    opportunity_score: number;
    status: string;
    comment_draft: string | null;
    created_at: string;
}

const tones = [
    { id: "helpful", name: "Helpful User", emoji: "👤" },
    { id: "enthusiast", name: "Enthusiast", emoji: "🔬" },
    { id: "solver", name: "Problem Solver", emoji: "🛠️" },
    { id: "casual", name: "Casual", emoji: "😎" },
];

const defaultSubreddits = ["IndianGaming", "india", "indiasocial", "bangalore", "mumbai"];

const platformConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    reddit: { label: "Reddit", icon: <Globe className="w-3 h-3" />, color: "text-orange-400" },
    youtube: { label: "YouTube", icon: <Youtube className="w-3 h-3" />, color: "text-red-400" },
    stackoverflow: { label: "Stack Overflow", icon: <Code className="w-3 h-3" />, color: "text-amber-400" },
    hackernews: { label: "Hacker News", icon: <Flame className="w-3 h-3" />, color: "text-orange-300" },
    quora: { label: "Quora", icon: <HelpCircle className="w-3 h-3" />, color: "text-red-300" },
    web: { label: "Web", icon: <Globe className="w-3 h-3" />, color: "text-blue-400" },
};

export default function ForumHubPage() {
    const [activeTab, setActiveTab] = useState<"discover" | "queue">("discover");
    const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
    const [selectedTone, setSelectedTone] = useState("helpful");
    const [generatedComment, setGeneratedComment] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [threads, setThreads] = useState<ForumThread[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isLive, setIsLive] = useState(false);

    // Discovery state
    const [showDiscovery, setShowDiscovery] = useState(false);
    const [discoveryQuery, setDiscoveryQuery] = useState("");
    const [discoverySubreddits, setDiscoverySubreddits] = useState<string[]>(defaultSubreddits.slice(0, 3));
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [sourcesStatus, setSourcesStatus] = useState<Record<string, boolean>>({});
    const [activeSourceCount, setActiveSourceCount] = useState<number | null>(null);
    const [platformFilter, setPlatformFilter] = useState<string>("all");

    // Smart Discovery State
    const [discoveryIndustry, setDiscoveryIndustry] = useState("");
    const [discoveryAudience, setDiscoveryAudience] = useState("");
    const [isSuggesting, setIsSuggesting] = useState(false);

    const handleSuggestSources = async () => {
        if (!discoveryIndustry) return;
        setIsSuggesting(true);
        try {
            const response = await fetch('/api/forum/suggest-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    industry: discoveryIndustry,
                    targetAudience: discoveryAudience
                }),
            });

            const data = await response.json();
            if (data.success && data.suggestions) {
                setDiscoverySubreddits(data.suggestions.subreddits);
                // Use first keyword as initial query if empty
                if (!discoveryQuery && data.suggestions.youtubeKeywords?.length > 0) {
                    setDiscoveryQuery(data.suggestions.youtubeKeywords[0]);
                }
            }
        } catch (error) {
            console.error("Failed to suggest sources:", error);
            setError("Failed to auto-discover sources. Please try manually.");
        } finally {
            setIsSuggesting(false);
        }
    };

    async function fetchThreads() {
        try {
            setError(null);

            const status = activeTab === "queue" ? "queued,drafted" : undefined;
            const url = `/api/forum/threads?limit=20${status ? `&status=${status}` : ''}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch threads');
            }

            const data = await response.json();
            setThreads(data.threads || []);
        } catch (err) {
            console.error('Error fetching threads:', err);
            setError('Failed to load threads');
        }
    }

    // Initial fetch and realtime setup
    useEffect(() => {
        async function init() {
            setLoading(true);
            await fetchThreads();
            setLoading(false);
            setIsLive(true);
        }
        init();

        // Setup Supabase Realtime subscription
        const supabase = createClient();

        const channel = supabase
            .channel('forum-hub-threads')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'forum_threads' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newThread = payload.new as ForumThread;
                        setThreads(prev => [newThread, ...prev].slice(0, 20));
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as ForumThread;
                        setThreads(prev => prev.map(t => t.id === updated.id ? updated : t));
                        if (selectedThread?.id === updated.id) {
                            setSelectedThread(updated);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as { id: string };
                        setThreads(prev => prev.filter(t => t.id !== deleted.id));
                    }
                }
            )
            .subscribe();

    }, [activeTab]);

    // Check source configuration
    useEffect(() => {
        fetch('/api/forum/discover')
            .then(res => res.json())
            .then(data => {
                setSourcesStatus(data.sources || {});
                setActiveSourceCount(data.activeCount || 0);
            })
            .catch(() => setActiveSourceCount(0));
    }, []);

    const handleDiscoverThreads = async () => {
        if (!discoveryQuery.trim()) return;

        setIsDiscovering(true);
        setError(null);

        try {
            const response = await fetch('/api/forum/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: discoveryQuery,
                    subreddits: discoverySubreddits,
                    keywords: discoveryQuery.split(' '),
                    limit: 20,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Discovery failed');
            }

            if (data.warnings && data.warnings.length > 0) {
                setWarnings(data.warnings);
            } else {
                setWarnings([]);
            }
            setShowDiscovery(false);
            setDiscoveryQuery("");

            // Force a manual refresh immediately to ensure new threads show up
            // even if Realtime events are delayed or lost.
            await fetchThreads();
        } catch (err) {
            console.error('Discovery error:', err);
            setError(err instanceof Error ? err.message : 'Discovery failed');
        } finally {
            setIsDiscovering(false);
        }
    };

    // Add warning handling in handleDiscoverThreads response processing or separate state
    const [warnings, setWarnings] = useState<string[]>([]);



    const handleGenerateComment = async () => {
        if (!selectedThread) return;
        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/forum/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadTitle: selectedThread.title,
                    // Pass context if available (e.g. from selectedThread.content or similar if added later)
                    tone: selectedTone,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Generation failed');
            }

            setGeneratedComment(data.comment);
        } catch (err) {
            console.error('Generation error:', err);
            setError('Failed to generate comment');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedComment);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddToQueue = async () => {
        if (!selectedThread || !generatedComment) return;

        try {
            const response = await fetch('/api/forum/threads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threadId: selectedThread.id,
                    status: 'queued',
                    commentDraft: generatedComment,
                }),
            });

            if (response.ok) {
                setGeneratedComment("");
                // Data will auto-update via realtime
            }
        } catch (err) {
            console.error('Error adding to queue:', err);
        }
    };

    const getIntentBadge = (thread: ForumThread) => {
        const title = thread.title.toLowerCase();

        if (title.includes('vs') || title.includes('compare') || title.includes('comparison')) {
            return { label: "🆚 Compare", variant: "warning" as const };
        }
        if (title.includes('buy') || title.includes('recommend') || title.includes('best') || title.includes('under')) {
            return { label: "🛒 Buying", variant: "success" as const };
        }
        return { label: "💡 Research", variant: "default" as const };
    };

    const filteredThreads = threads.filter(thread => {
        if (activeTab === "queue") {
            return thread.status === "queued" || thread.status === "drafted";
        }
        if (platformFilter !== "all" && thread.platform !== platformFilter) {
            return false;
        }
        if (searchQuery) {
            return thread.title.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
    });

    const queueCount = threads.filter(t => t.status === "queued" || t.status === "drafted").length;

    return (
        <>
            <Header
                title="Forum Hub"
                description="Discover and engage with forum opportunities"
            />

            <div className="p-6 space-y-6">
                {/* Live indicator */}
                {isLive && (
                    <div className="flex items-center gap-2 text-xs text-green-400">
                        <Radio className="w-3 h-3 animate-pulse" />
                        <span>Live updates enabled</span>
                    </div>
                )}

                {/* Source status info */}
                {activeSourceCount !== null && (
                    <div className="rounded-xl border border-[var(--border)]/50 bg-[var(--surface-elevated)]/30 p-3 flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <Radar className="w-4 h-4 text-indigo-400" />
                            <span className="font-medium text-[var(--text-secondary)]">{activeSourceCount} sources active:</span>
                            {Object.entries(sourcesStatus).map(([key, active]) => {
                                const config = platformConfig[key];
                                return config ? (
                                    <span key={key} className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                                        active ? `${config.color} bg-[var(--surface-elevated)]/50` : "text-[var(--text-ghost)] line-through"
                                    )}>
                                        {config.icon}
                                        {config.label}
                                    </span>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}

                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab("discover")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === "discover"
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                            )}
                        >
                            <Search className="w-4 h-4 inline mr-2" />
                            Discover
                        </button>
                        <button
                            onClick={() => setActiveTab("queue")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === "queue"
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                            )}
                        >
                            <MessageSquare className="w-4 h-4 inline mr-2" />
                            Queue ({queueCount})
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Search threads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64"
                        />
                        <Button
                            variant="outline"
                            onClick={() => setShowDiscovery(true)}
                        >
                            <Radar className="w-4 h-4 mr-1" />
                            Discover
                        </Button>
                        <Button variant="outline" onClick={fetchThreads}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Platform filter pills */}
                {activeTab === "discover" && threads.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setPlatformFilter("all")}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                                platformFilter === "all"
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                    : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            )}
                        >
                            All
                        </button>
                        {Object.entries(platformConfig).map(([key, config]) => {
                            const count = threads.filter(t => t.platform === key).length;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setPlatformFilter(key)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                                        platformFilter === key
                                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                            : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    )}
                                >
                                    {config.icon}
                                    {config.label} ({count})
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Discovery Modal */}
                {showDiscovery && (
                    <Card className="border-indigo-500/30 bg-violet-950/10 backdrop-blur-md animate-in zoom-in-95 duration-300 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Radar className="w-5 h-5 text-indigo-400" />
                                Discover Forum Threads
                            </CardTitle>
                            <p className="text-xs text-[var(--text-ghost)]">Searches across Stack Overflow, Hacker News, YouTube, Reddit, Quora, and more</p>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Smart Discovery Section */}
                            <div className="bg-violet-900/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                                <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Smart Source Finder
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        placeholder="Industry (e.g. Hiking)"
                                        value={discoveryIndustry}
                                        onChange={(e) => setDiscoveryIndustry(e.target.value)}
                                        className="bg-[var(--surface)] border-[var(--border)] h-9 text-sm"
                                    />
                                    <Input
                                        placeholder="Audience (e.g. Beginners)"
                                        value={discoveryAudience}
                                        onChange={(e) => setDiscoveryAudience(e.target.value)}
                                        className="bg-[var(--surface)] border-[var(--border)] h-9 text-sm"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full h-8 text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30"
                                    onClick={handleSuggestSources}
                                    disabled={!discoveryIndustry || isSuggesting}
                                >
                                    {isSuggesting ? (
                                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-3 h-3 mr-2" />
                                    )}
                                    Auto-Find Best Subreddits & Keywords
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Search Query
                                    </label>
                                    <Input
                                        placeholder="e.g., best tyre inflator India"
                                        value={discoveryQuery}
                                        onChange={(e) => setDiscoveryQuery(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Subreddits to Search
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {discoverySubreddits.map((sub) => (
                                            <button
                                                key={sub}
                                                onClick={() => {
                                                    setDiscoverySubreddits(prev =>
                                                        prev.filter(s => s !== sub)
                                                    );
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-sm bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-red-500/20 hover:text-red-400 group flex items-center gap-1 transition-all"
                                            >
                                                r/{sub}
                                                <span className="hidden group-hover:inline ml-1">×</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add subreddit..."
                                            className="h-8 text-sm bg-[var(--surface-elevated)] border-[var(--border)]"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = e.currentTarget.value.trim();
                                                    if (val && !discoverySubreddits.includes(val)) {
                                                        setDiscoverySubreddits([...discoverySubreddits, val]);
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-[var(--text-ghost)] mt-2">
                                        Common: {defaultSubreddits.filter(s => !discoverySubreddits.includes(s)).slice(0, 5).map(s => (
                                            <span
                                                key={s}
                                                className="cursor-pointer hover:text-indigo-400 mx-1"
                                                onClick={() => setDiscoverySubreddits([...discoverySubreddits, s])}
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
                                <Button variant="ghost" onClick={() => setShowDiscovery(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleDiscoverThreads}
                                    disabled={isDiscovering || !discoveryQuery.trim()}
                                    className="bg-indigo-500 hover:bg-violet-700"
                                >
                                    {isDiscovering ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4 mr-2" />
                                            Start Discovery
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {warnings.length > 0 && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                            <p className="text-yellow-400 font-medium">Warning</p>
                        </div>
                        <ul className="list-disc list-inside text-sm text-yellow-300/80 ml-8">
                            {warnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Thread List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {activeTab === "discover" ? "Discovered Threads" : "Comment Queue"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="p-4 rounded-lg bg-[var(--surface-elevated)]">
                                        <Skeleton className="h-4 w-12 mb-2" />
                                        <Skeleton className="h-4 w-3/4 mb-2" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                ))
                            ) : filteredThreads.length > 0 ? (
                                filteredThreads.map((thread, index) => {
                                    const priority = getPriorityLabel(thread.opportunity_score);
                                    const intent = getIntentBadge(thread);

                                    return (
                                        <div
                                            key={thread.id}
                                            onClick={() => setSelectedThread(thread)}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                            className={cn(
                                                "p-4 rounded-lg cursor-pointer transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards",
                                                selectedThread?.id === thread.id
                                                    ? "bg-violet-900/30 border-l-4 border-l-violet-500 shadow-xl"
                                                    : "bg-[var(--surface-elevated)]/20 hover:bg-[var(--surface-elevated)] border-l-4 border-l-transparent hover:border-l-zinc-600"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn(
                                                            "text-lg font-bold",
                                                            getScoreColor(thread.opportunity_score)
                                                        )}>
                                                            {thread.opportunity_score}
                                                        </span>
                                                        <Badge variant={thread.opportunity_score >= 80 ? "warning" : "outline"}>
                                                            {priority.emoji} {priority.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="font-medium text-[var(--text-primary)] text-sm mb-2 line-clamp-2">
                                                        {thread.title}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-[var(--text-ghost)]">
                                                        <span className={cn(
                                                            "flex items-center gap-1",
                                                            platformConfig[thread.platform]?.color || "text-[var(--text-ghost)]"
                                                        )}>
                                                            {platformConfig[thread.platform]?.icon}
                                                            {thread.platform === "reddit" ? `r/${thread.subreddit || "reddit"}` : (thread.subreddit || platformConfig[thread.platform]?.label || thread.platform)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <ThumbsUp className="w-3 h-3" />
                                                            {thread.score}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MessageCircle className="w-3 h-3" />
                                                            {thread.num_comments}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge variant={intent.variant}>{intent.label}</Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-[var(--text-ghost)]">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>
                                        {activeTab === "queue"
                                            ? "No threads in queue yet"
                                            : "No threads discovered yet"
                                        }
                                    </p>
                                    <p className="text-sm mt-2">
                                        {activeTab === "discover"
                                            ? "Add threads manually or configure forum sources"
                                            : "Generate comments and add threads to queue"
                                        }
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Comment Generator */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                AI Comment Studio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedThread ? (
                                <>
                                    <div className="p-3 bg-[var(--surface-elevated)] rounded-lg">
                                        <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">
                                            {selectedThread.title}
                                        </p>
                                        <a
                                            href={selectedThread.url}
                                            target="_blank"
                                            className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                                        >
                                            Open thread <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                            Tone / Persona
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {tones.map((tone) => (
                                                <button
                                                    key={tone.id}
                                                    onClick={() => setSelectedTone(tone.id)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-sm transition-all",
                                                        selectedTone === tone.id
                                                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                                            : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                    )}
                                                >
                                                    {tone.emoji} {tone.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleGenerateComment}
                                        disabled={isGenerating}
                                        className="w-full"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Comment
                                            </>
                                        )}
                                    </Button>

                                    {generatedComment && (
                                        <div className="space-y-3">
                                            <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                                                    {generatedComment}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={handleCopy}>
                                                    {copied ? (
                                                        <>
                                                            <Check className="w-4 h-4 mr-1" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4 mr-1" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={handleGenerateComment}>
                                                    Regenerate
                                                </Button>
                                                <Button size="sm" onClick={handleAddToQueue}>
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Add to Queue
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {selectedThread.comment_draft && !generatedComment && (
                                        <div className="space-y-3">
                                            <p className="text-sm text-[var(--text-muted)]">Existing draft:</p>
                                            <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                                                    {selectedThread.comment_draft}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 text-[var(--text-ghost)]">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>Select a thread to generate a comment</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
