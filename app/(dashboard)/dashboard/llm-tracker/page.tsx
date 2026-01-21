"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, getScoreColor, getScoreBgColor } from "@/lib/utils";
import {
    Search,
    Sparkles,
    Bot,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    Plus,
    Eye,
    MessageSquare,
    ExternalLink,
} from "lucide-react";

// Platform icons/colors
const platforms = [
    { id: "chatgpt", name: "ChatGPT", color: "bg-green-500" },
    { id: "gemini", name: "Gemini", color: "bg-blue-500" },
    { id: "perplexity", name: "Perplexity", color: "bg-purple-500" },
    { id: "claude", name: "Claude", color: "bg-orange-500" },
];

// Mock data for recent scans
const mockScans = [
    {
        id: 1,
        prompt: "best tyre inflator in India under 3000",
        platforms: ["chatgpt", "gemini"],
        brandMentioned: true,
        mentionPosition: 2,
        sentiment: "positive",
        competitors: ["Qubo", "Portronics"],
        scannedAt: "2 hours ago",
    },
    {
        id: 2,
        prompt: "portable car air pump recommendation",
        platforms: ["perplexity", "chatgpt"],
        brandMentioned: true,
        mentionPosition: 1,
        sentiment: "positive",
        competitors: ["Bosch"],
        scannedAt: "5 hours ago",
    },
    {
        id: 3,
        prompt: "electric tyre inflator vs manual pump",
        platforms: ["gemini"],
        brandMentioned: false,
        mentionPosition: null,
        sentiment: null,
        competitors: ["Michelin", "Amazon Basics"],
        scannedAt: "1 day ago",
    },
];

// Mock visibility trends
const mockTrends = [
    { platform: "ChatGPT", score: 72, change: 5 },
    { platform: "Gemini", score: 68, change: -2 },
    { platform: "Perplexity", score: 45, change: 12 },
    { platform: "Claude", score: 38, change: 0 },
];

export default function LLMTrackerPage() {
    const [newPrompt, setNewPrompt] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["gemini"]);

    const handleScan = async () => {
        if (!newPrompt.trim()) return;
        setIsScanning(true);

        // TODO: Call API endpoint
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsScanning(false);
        setNewPrompt("");
    };

    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };

    return (
        <>
            <Header
                title="LLM Tracker"
                description="Monitor your brand visibility across AI platforms"
            />

            <div className="p-6 space-y-6">
                {/* Visibility Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {mockTrends.map((trend) => (
                        <Card key={trend.platform}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-400">{trend.platform}</span>
                                    <div className={cn(
                                        "flex items-center gap-1 text-xs",
                                        trend.change > 0 && "text-green-400",
                                        trend.change < 0 && "text-red-400",
                                        trend.change === 0 && "text-zinc-500"
                                    )}>
                                        {trend.change > 0 ? <TrendingUp className="w-3 h-3" /> :
                                            trend.change < 0 ? <TrendingDown className="w-3 h-3" /> :
                                                <Minus className="w-3 h-3" />}
                                        {trend.change > 0 ? "+" : ""}{trend.change}%
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className={cn("text-3xl font-bold", getScoreColor(trend.score))}>
                                        {trend.score}
                                    </span>
                                    <span className="text-zinc-500 text-sm mb-1">/100</span>
                                </div>
                                {/* Mini progress bar */}
                                <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all",
                                            trend.score >= 70 ? "bg-green-500" :
                                                trend.score >= 50 ? "bg-yellow-500" :
                                                    "bg-red-500"
                                        )}
                                        style={{ width: `${trend.score}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* New Scan */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-violet-400" />
                            Run a New Scan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter a prompt to test (e.g., 'best tyre inflator in India')"
                                value={newPrompt}
                                onChange={(e) => setNewPrompt(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleScan}
                                disabled={isScanning || !newPrompt.trim()}
                            >
                                {isScanning ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Search className="w-4 h-4 mr-2" />
                                        Scan
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Platform selection */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-400">Platforms:</span>
                            <div className="flex gap-2">
                                {platforms.map((platform) => (
                                    <button
                                        key={platform.id}
                                        onClick={() => togglePlatform(platform.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                                            selectedPlatforms.includes(platform.id)
                                                ? "bg-zinc-700 text-zinc-100 border border-zinc-600"
                                                : "bg-zinc-800/50 text-zinc-500 border border-transparent hover:border-zinc-700"
                                        )}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", platform.color)} />
                                        {platform.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Scans */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Scans</CardTitle>
                        <Button variant="ghost" size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Prompt
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {mockScans.map((scan) => (
                                <div
                                    key={scan.id}
                                    className="p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Bot className="w-4 h-4 text-zinc-500" />
                                                <p className="font-medium text-zinc-200 truncate">
                                                    "{scan.prompt}"
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-4 text-sm">
                                                {/* Platforms scanned */}
                                                <div className="flex items-center gap-1">
                                                    {scan.platforms.map((pid) => {
                                                        const p = platforms.find(x => x.id === pid);
                                                        return (
                                                            <div
                                                                key={pid}
                                                                className={cn("w-2 h-2 rounded-full", p?.color)}
                                                                title={p?.name}
                                                            />
                                                        );
                                                    })}
                                                    <span className="text-zinc-500 ml-1">
                                                        {scan.platforms.length} platform{scan.platforms.length > 1 ? 's' : ''}
                                                    </span>
                                                </div>

                                                {/* Mention status */}
                                                {scan.brandMentioned ? (
                                                    <div className="flex items-center gap-1 text-green-400">
                                                        <Eye className="w-3 h-3" />
                                                        Position #{scan.mentionPosition}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-red-400">
                                                        <Eye className="w-3 h-3" />
                                                        Not mentioned
                                                    </div>
                                                )}

                                                {/* Competitors */}
                                                {scan.competitors.length > 0 && (
                                                    <div className="flex items-center gap-1 text-zinc-500">
                                                        <MessageSquare className="w-3 h-3" />
                                                        {scan.competitors.join(", ")}
                                                    </div>
                                                )}

                                                {/* Time */}
                                                <span className="text-zinc-600">{scan.scannedAt}</span>
                                            </div>
                                        </div>

                                        {/* Sentiment badge */}
                                        {scan.sentiment && (
                                            <Badge
                                                variant={
                                                    scan.sentiment === 'positive' ? 'success' :
                                                        scan.sentiment === 'negative' ? 'destructive' :
                                                            'outline'
                                                }
                                            >
                                                {scan.sentiment}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Tracked Prompts */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Tracked Prompts</CardTitle>
                        <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Prompt
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                                { prompt: "best tyre inflator in India", visibility: 75, lastScan: "2h ago" },
                                { prompt: "portable car air pump", visibility: 62, lastScan: "5h ago" },
                                { prompt: "electric tyre inflator review", visibility: 45, lastScan: "1d ago" },
                                { prompt: "car accessories under 5000", visibility: 30, lastScan: "2d ago" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "p-4 rounded-lg border transition-colors cursor-pointer",
                                        getScoreBgColor(item.visibility)
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={cn("text-2xl font-bold", getScoreColor(item.visibility))}>
                                            {item.visibility}%
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <RefreshCw className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-zinc-300 mb-1">"{item.prompt}"</p>
                                    <p className="text-xs text-zinc-500">Last scan: {item.lastScan}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
