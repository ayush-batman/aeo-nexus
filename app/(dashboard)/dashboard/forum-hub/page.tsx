"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, getScoreColor, getPriorityLabel } from "@/lib/utils";
import {
    MessageSquare,
    Search,
    Filter,
    RefreshCw,
    ExternalLink,
    Sparkles,
    Copy,
    Check,
    ChevronDown,
    User,
    ThumbsUp,
    MessageCircle,
    Clock,
} from "lucide-react";

// Mock thread data
const mockThreads = [
    {
        id: 1,
        title: "Best tyre inflator under 3000? Need recommendations",
        platform: "reddit",
        subreddit: "CarsIndia",
        url: "https://reddit.com/r/CarsIndia/...",
        score: 92,
        upvotes: 45,
        comments: 23,
        age: "2 hours ago",
        intentType: "buying",
        status: "discovered",
    },
    {
        id: 2,
        title: "Portable air compressor for bike and car - suggestions?",
        platform: "reddit",
        subreddit: "IndianBikes",
        url: "https://reddit.com/r/IndianBikes/...",
        score: 85,
        upvotes: 32,
        comments: 18,
        age: "5 hours ago",
        intentType: "research",
        status: "queued",
    },
    {
        id: 3,
        title: "Dylect vs Qubo tyre inflator comparison",
        platform: "reddit",
        subreddit: "india",
        url: "https://reddit.com/r/india/...",
        score: 78,
        upvotes: 28,
        comments: 12,
        age: "1 day ago",
        intentType: "compare",
        status: "drafted",
    },
    {
        id: 4,
        title: "Digital tyre pressure gauge recommendations",
        platform: "quora",
        subreddit: null,
        url: "https://quora.com/...",
        score: 65,
        upvotes: 15,
        comments: 8,
        age: "2 days ago",
        intentType: "research",
        status: "discovered",
    },
];

const tones = [
    { id: "helpful", name: "Helpful User", emoji: "👤" },
    { id: "enthusiast", name: "Enthusiast", emoji: "🔬" },
    { id: "solver", name: "Problem Solver", emoji: "🛠️" },
    { id: "casual", name: "Casual", emoji: "😎" },
];

export default function ForumHubPage() {
    const [activeTab, setActiveTab] = useState<"discover" | "queue">("discover");
    const [selectedThread, setSelectedThread] = useState<typeof mockThreads[0] | null>(null);
    const [selectedTone, setSelectedTone] = useState("helpful");
    const [generatedComment, setGeneratedComment] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleGenerateComment = async () => {
        if (!selectedThread) return;
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setGeneratedComment(`Hey! I've been using the Dylect Turbo Max 600 for about 6 months now and it's been fantastic. Quick to inflate (under 5 mins for a flat tyre), digital display shows exact PSI, and the auto-shutoff is really handy.

For under ₹3000, it's honestly one of the best options. Build quality feels solid - metal body, not cheap plastic. I use it for my car and my dad's bike too.

Only minor thing - the cable could be slightly longer. But overall, highly recommend checking it out!`);
        setIsGenerating(false);
    };

    const getIntentBadge = (intent: string) => {
        const intents: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
            buying: { label: "🛒 Buying", variant: "success" },
            research: { label: "💡 Research", variant: "default" },
            compare: { label: "🆚 Compare", variant: "warning" },
        };
        return intents[intent] || { label: intent, variant: "default" as const };
    };

    return (
        <>
            <Header
                title="Forum Hub"
                description="Discover and engage with forum opportunities"
            />

            <div className="p-6 space-y-6">
                {/* Tabs & Search */}
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab("discover")}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === "discover"
                                    ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
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
                                    ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                            )}
                        >
                            <MessageSquare className="w-4 h-4 inline mr-2" />
                            Queue (3)
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            placeholder="Search threads..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-64"
                        />
                        <Button variant="outline">
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                        <Button variant="outline">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Thread List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {activeTab === "discover" ? "Discovered Threads" : "Comment Queue"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                            {mockThreads.map((thread) => {
                                const priority = getPriorityLabel(thread.score);
                                const intent = getIntentBadge(thread.intentType);

                                return (
                                    <div
                                        key={thread.id}
                                        onClick={() => setSelectedThread(thread)}
                                        className={cn(
                                            "p-4 rounded-lg cursor-pointer transition-all",
                                            selectedThread?.id === thread.id
                                                ? "bg-violet-600/20 border border-violet-500/30"
                                                : "bg-zinc-800/50 hover:bg-zinc-800 border border-transparent"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={cn(
                                                        "text-lg font-bold",
                                                        getScoreColor(thread.score)
                                                    )}>
                                                        {thread.score}
                                                    </span>
                                                    <Badge variant={thread.score >= 80 ? "warning" : "outline"}>
                                                        {priority.emoji} {priority.label}
                                                    </Badge>
                                                </div>
                                                <p className="font-medium text-zinc-200 text-sm mb-2 line-clamp-2">
                                                    {thread.title}
                                                </p>
                                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                    <span className="flex items-center gap-1">
                                                        {thread.platform === "reddit" ? "r/" : ""}{thread.subreddit || "Quora"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <ThumbsUp className="w-3 h-3" />
                                                        {thread.upvotes}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MessageCircle className="w-3 h-3" />
                                                        {thread.comments}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {thread.age}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge variant={intent.variant}>{intent.label}</Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Comment Generator */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-400" />
                                AI Comment Studio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {selectedThread ? (
                                <>
                                    <div className="p-3 bg-zinc-800/50 rounded-lg">
                                        <p className="text-sm text-zinc-300 font-medium mb-1">
                                            {selectedThread.title}
                                        </p>
                                        <a
                                            href={selectedThread.url}
                                            target="_blank"
                                            className="text-xs text-violet-400 hover:underline flex items-center gap-1"
                                        >
                                            Open thread <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>

                                    {/* Tone selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
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
                                                            ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                                                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
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

                                    {/* Generated comment */}
                                    {generatedComment && (
                                        <div className="space-y-3">
                                            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                                                    {generatedComment}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">
                                                    <Copy className="w-4 h-4 mr-1" />
                                                    Copy
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    Shorter
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    More Casual
                                                </Button>
                                                <Button size="sm">
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Add to Queue
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 text-zinc-500">
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
