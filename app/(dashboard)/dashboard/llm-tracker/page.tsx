"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getScoreColor, getScoreBgColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ScheduledScans } from "@/components/dashboard/llm-tracker/scheduled-scans";
import { QuestionVariants } from "@/components/dashboard/llm-tracker/question-variants";
import {
    Search,
    Sparkles,
    Bot,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    Eye,
    MessageSquare,
    AlertCircle,
    Radio,
    Link2,
    Layers,
    ChevronDown,
    ChevronUp,
    Users,
    Globe,
    X,
    Plus,
    Lightbulb,
    ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { generateRecommendations, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/lib/ai/recommendations";

// Platform icons/colors
const platforms = [
    { id: "chatgpt", name: "ChatGPT", color: "bg-green-500" },
    { id: "gemini", name: "Gemini", color: "bg-blue-500" },
    { id: "perplexity", name: "Perplexity", color: "bg-purple-500" },
    { id: "claude", name: "Claude", color: "bg-orange-500" },
    { id: "google_ai_overview", name: "AI Overview", color: "bg-cyan-500" },
];

interface LLMScan {
    id: string;
    platform: string;
    prompt: string;
    response: string;
    brand_mentioned: boolean;
    mention_position: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitors_mentioned: string[];
    citations: { url: string; title: string; is_own_domain: boolean }[] | null;
    created_at: string;
}

interface PlatformVisibility {
    platform: string;
    score: number;
    change: number;
    scanCount: number;
}

export default function LLMTrackerPage() {
    const [newPrompt, setNewPrompt] = useState("");
    const [brandName, setBrandName] = useState("Dylect");
    const [isScanning, setIsScanning] = useState(false);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["gemini"]);
    const [scans, setScans] = useState<LLMScan[]>([]);
    const [visibilityMetrics, setVisibilityMetrics] = useState<PlatformVisibility[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [newCompetitor, setNewCompetitor] = useState("");
    const [expandedScan, setExpandedScan] = useState<number | null>(null);
    const [scanRegion, setScanRegion] = useState<string>("global");

    const REGIONS = [
        { id: "global", label: "🌐 Global", context: "" },
        { id: "us", label: "🇺🇸 US", context: "Respond as if answering from the United States in English. " },
        { id: "in", label: "🇮🇳 India", context: "Respond as if answering from India in English. " },
        { id: "uk", label: "🇬🇧 UK", context: "Respond as if answering from the United Kingdom in English. " },
        { id: "de", label: "🇩🇪 Germany", context: "Respond as if answering from Germany in German (Deutsch). " },
        { id: "es", label: "🇪🇸 Spain", context: "Respond as if answering from Spain in Spanish (Español). " },
    ];

    // Fetch data function
    async function fetchData() {
        try {
            setError(null);

            const [scansRes, statsRes] = await Promise.all([
                fetch('/api/llm/scans?limit=20'),
                fetch('/api/dashboard/stats'),
            ]);

            if (scansRes.ok) {
                const scansData = await scansRes.json();
                setScans(scansData.scans || []);
            }

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setVisibilityMetrics(statsData.visibilityMetrics || []);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load data');
        }
    }

    // Load competitors from workspace settings
    async function loadCompetitors() {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single();
            if (!userData) return;
            const { data: ws } = await supabase.from('workspaces').select('name, settings').eq('org_id', userData.org_id).limit(1).single();
            if (ws) {
                if (ws.name) setBrandName(ws.name);
                if (ws.settings?.competitors) setCompetitors(ws.settings.competitors);
            }
        } catch (err) {
            console.error('Error loading workspace settings:', err);
        }
    }

    // Initial fetch and realtime setup
    useEffect(() => {
        async function init() {
            setLoading(true);
            await Promise.all([fetchData(), loadCompetitors()]);
            setLoading(false);
            setIsLive(true);
        }
        init();

        // Setup Supabase Realtime subscription
        const supabase = createClient();

        const channel = supabase
            .channel('llm-tracker-scans')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'llm_scans' },
                (payload) => {
                    // Add new scan to top of list
                    const newScan = payload.new as LLMScan;
                    setScans(prev => [newScan, ...prev].slice(0, 20));
                    // Also refresh visibility metrics
                    fetch('/api/dashboard/stats')
                        .then(res => res.json())
                        .then(data => setVisibilityMetrics(data.visibilityMetrics || []))
                        .catch(console.error);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleScan = async () => {
        if (!newPrompt.trim() || !brandName.trim()) return;

        setIsScanning(true);
        setScanError(null);

        try {
            const response = await fetch('/api/llm/scans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: (REGIONS.find(r => r.id === scanRegion)?.context || '') + newPrompt,
                    brandName,
                    platforms: selectedPlatforms,
                    competitors,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errMsg = data.platformErrors
                    ? `Some platforms failed: ${data.platformErrors.map((e: any) => `${e.platform} (${e.error})`).join(', ')}`
                    : data.error || 'Scan failed';
                throw new Error(errMsg);
            }

            // Show partial failures as warnings
            if (data.platformErrors && data.platformErrors.length > 0) {
                setScanError(`⚠️ Partial success: ${data.platformErrors.map((e: any) => `${e.platform} failed`).join(', ')}`);
            }

            setNewPrompt("");
            // Data will auto-refresh via realtime subscription
        } catch (err) {
            console.error('Scan error:', err);
            setScanError(err instanceof Error ? err.message : 'Failed to run scan. Please check your API keys.');
        } finally {
            setIsScanning(false);
        }
    };

    const togglePlatform = (platformId: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platformId)
                ? prev.filter(p => p !== platformId)
                : [...prev, platformId]
        );
    };

    function addCompetitorTag() {
        const name = newCompetitor.trim();
        if (!name || competitors.includes(name)) return;
        setCompetitors(prev => [...prev, name]);
        setNewCompetitor("");
    }

    // Group scans by prompt for display
    const groupedScans = scans.reduce((acc, scan) => {
        const key = scan.prompt;
        if (!acc[key]) {
            acc[key] = {
                prompt: scan.prompt,
                platforms: [],
                brandMentioned: false,
                mentionPosition: null as number | null,
                sentiment: null as string | null,
                competitors: [] as string[],
                citations: [] as { url: string; title: string; is_own_domain: boolean }[],
                scannedAt: scan.created_at,
            };
        }
        acc[key].platforms.push(scan.platform);
        if (scan.brand_mentioned) {
            acc[key].brandMentioned = true;
            if (!acc[key].mentionPosition || (scan.mention_position && scan.mention_position < acc[key].mentionPosition!)) {
                acc[key].mentionPosition = scan.mention_position;
            }
        }
        if (scan.sentiment && !acc[key].sentiment) {
            acc[key].sentiment = scan.sentiment;
        }
        if (scan.competitors_mentioned) {
            acc[key].competitors = [...new Set([...acc[key].competitors, ...scan.competitors_mentioned])];
        }
        if (scan.citations && scan.citations.length > 0) {
            const existingUrls = new Set(acc[key].citations.map(c => c.url));
            for (const c of scan.citations) {
                if (!existingUrls.has(c.url)) {
                    acc[key].citations.push(c);
                    existingUrls.add(c.url);
                }
            }
        }
        return acc;
    }, {} as Record<string, { prompt: string; platforms: string[]; brandMentioned: boolean; mentionPosition: number | null; sentiment: string | null; competitors: string[]; citations: { url: string; title: string; is_own_domain: boolean }[]; scannedAt: string }>);

    const scanGroups = Object.values(groupedScans).slice(0, 10);

    return (
        <>
            <Header
                title="LLM Tracker"
                description="Monitor your brand visibility across AI platforms"
            />

            <div className="p-6">
                <Tabs defaultValue="manual" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-[var(--bg-raised)] border-[var(--border-default)]">
                            <TabsTrigger value="manual" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                                <Search className="w-4 h-4 mr-2" />
                                Manual Scan
                            </TabsTrigger>
                            <TabsTrigger value="schedules" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                                <Bot className="w-4 h-4 mr-2" />
                                Scheduled Scans
                            </TabsTrigger>
                            <TabsTrigger value="variants" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                                <Layers className="w-4 h-4 mr-2" />
                                Question Variants
                            </TabsTrigger>
                        </TabsList>

                        {/* Live indicator */}
                        {isLive && (
                            <div className="flex items-center gap-2 text-xs text-green-400 mt-2 sm:mt-0">
                                <Radio className="w-3 h-3 animate-pulse" />
                                <span>Live updates enabled</span>
                            </div>
                        )}
                    </div>

                    <TabsContent value="manual" className="space-y-6 mt-0">

                        {/* Visibility Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {loading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <Card key={i}>
                                        <CardContent className="p-4">
                                            <Skeleton className="h-4 w-20 mb-2" />
                                            <Skeleton className="h-8 w-16 mb-2" />
                                            <Skeleton className="h-1.5 w-full rounded-full" />
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                platforms.map((platform) => {
                                    const metrics = visibilityMetrics.find(
                                        m => m.platform.toLowerCase() === platform.id
                                    );
                                    const score = metrics?.score || 0;
                                    const change = metrics?.change || 0;

                                    return (
                                        <Card key={platform.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm text-[var(--text-secondary)]">{platform.name}</span>
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-xs",
                                                        change > 0 && "text-green-400",
                                                        change < 0 && "text-red-400",
                                                        change === 0 && "text-[var(--text-ghost)]"
                                                    )}>
                                                        {change > 0 ? <TrendingUp className="w-3 h-3" /> :
                                                            change < 0 ? <TrendingDown className="w-3 h-3" /> :
                                                                <Minus className="w-3 h-3" />}
                                                        {change > 0 ? "+" : ""}{change}%
                                                    </div>
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <span className={cn("text-3xl font-bold", getScoreColor(score))}>
                                                        {score}
                                                    </span>
                                                    <span className="text-[var(--text-ghost)] text-sm mb-1">/100</span>
                                                </div>
                                                <div className="mt-2 h-1.5 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all",
                                                            score >= 70 ? "bg-green-500" :
                                                                score >= 50 ? "bg-yellow-500" :
                                                                    "bg-red-500"
                                                        )}
                                                        style={{ width: `${score}%` }}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>

                        {/* New Scan */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
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
                                    <Input
                                        placeholder="Brand name"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        className="w-40"
                                    />
                                    <Button
                                        onClick={handleScan}
                                        disabled={isScanning || !newPrompt.trim() || !brandName.trim()}
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

                                {scanError && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {scanError}
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[var(--text-secondary)]">Platforms:</span>
                                    <div className="flex gap-2">
                                        {platforms.map((platform) => (
                                            <button
                                                key={platform.id}
                                                onClick={() => togglePlatform(platform.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                                                    selectedPlatforms.includes(platform.id)
                                                        ? "bg-[var(--bg-raised)] text-[var(--text-primary)] border border-[var(--border-hover)]"
                                                        : "bg-[var(--bg-raised)] text-[var(--text-ghost)] border border-transparent hover:border-[var(--border-default)]"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", platform.color)} />
                                                {platform.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Region / Language */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[var(--text-secondary)]">Region:</span>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {REGIONS.map((region) => (
                                            <button
                                                key={region.id}
                                                onClick={() => setScanRegion(region.id)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-lg text-xs transition-all",
                                                    scanRegion === region.id
                                                        ? "bg-[var(--bg-raised)] text-[var(--text-primary)] border border-[var(--border-hover)]"
                                                        : "bg-[var(--bg-raised)] text-[var(--text-ghost)] border border-transparent hover:border-[var(--border-default)]"
                                                )}
                                            >
                                                {region.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Competitors */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-[var(--text-secondary)]">Competitors:</span>
                                    {competitors.length > 0 ? (
                                        competitors.map(c => (
                                            <div key={c} className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-raised)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                                                {c}
                                                <button onClick={() => setCompetitors(prev => prev.filter(x => x !== c))} className="text-[var(--text-ghost)] hover:text-red-400">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-xs text-[var(--text-ghost)]">None — add in Settings or inline</span>
                                    )}
                                    <div className="flex gap-1">
                                        <Input
                                            placeholder="Add..."
                                            value={newCompetitor}
                                            onChange={(e) => setNewCompetitor(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCompetitorTag()}
                                            className="h-7 w-28 text-xs"
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addCompetitorTag} disabled={!newCompetitor.trim()}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Scans */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Recent Scans</CardTitle>
                                <Button variant="ghost" size="sm" onClick={fetchData}>
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Refresh
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <div key={i} className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                                <Skeleton className="h-4 w-3/4 mb-3" />
                                                <Skeleton className="h-3 w-1/2" />
                                            </div>
                                        ))}
                                    </div>
                                ) : scanGroups.length > 0 ? (
                                    <div className="space-y-3">
                                        {scanGroups.map((scan, index) => (
                                            <div
                                                key={index}
                                                className="p-4 rounded-lg bg-[var(--bg-raised)] hover:bg-[var(--bg-raised)] transition-colors cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Bot className="w-4 h-4 text-[var(--text-ghost)]" />
                                                            <p className="font-medium text-[var(--text-primary)] truncate">
                                                                "{scan.prompt}"
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-sm">
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
                                                                <span className="text-[var(--text-ghost)] ml-1">
                                                                    {scan.platforms.length} platform{scan.platforms.length > 1 ? 's' : ''}
                                                                </span>
                                                            </div>

                                                            {scan.brandMentioned ? (
                                                                <div className="flex items-center gap-1 text-green-400">
                                                                    <Eye className="w-3 h-3" />
                                                                    Position #{scan.mentionPosition || '?'}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-red-400">
                                                                    <Eye className="w-3 h-3" />
                                                                    Not mentioned
                                                                </div>
                                                            )}

                                                            {scan.competitors.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[var(--text-ghost)]">
                                                                    <Users className="w-3 h-3" />
                                                                    {scan.competitors.join(", ")}
                                                                </div>
                                                            )}

                                                            {scan.citations.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[var(--text-ghost)]">
                                                                    <Link2 className="w-3 h-3" />
                                                                    {scan.citations.length} source{scan.citations.length > 1 ? 's' : ''}
                                                                </div>
                                                            )}

                                                            <span className="text-[var(--text-ghost)]">
                                                                {formatDistanceToNow(new Date(scan.scannedAt), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
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
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => setExpandedScan(expandedScan === index ? null : index)}
                                                        >
                                                            {expandedScan === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Expanded details */}
                                                {expandedScan === index && (
                                                    <div className="mt-3 pt-3 border-t border-[var(--border-default)]/50 space-y-3">
                                                        {/* Citations */}
                                                        {scan.citations.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                                                                    <Link2 className="w-3 h-3" /> Cited Sources
                                                                </p>
                                                                <div className="space-y-1">
                                                                    {scan.citations.map((citation, ci) => (
                                                                        <div key={ci} className="flex items-center gap-2 text-xs">
                                                                            <Globe className="w-3 h-3 text-[var(--text-ghost)] flex-shrink-0" />
                                                                            <a
                                                                                href={citation.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-indigo-400 hover:text-indigo-300 truncate"
                                                                            >
                                                                                {citation.title || citation.url}
                                                                            </a>
                                                                            {citation.is_own_domain && (
                                                                                <Badge variant="default" className="text-[10px] px-1.5 py-0">Your Site</Badge>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Competitor positions */}
                                                        {scan.competitors.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                                                                    <Users className="w-3 h-3" /> Competitor Mentions
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {scan.competitors.map((comp) => (
                                                                        <Badge key={comp} variant="outline" className="text-xs">
                                                                            {comp}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-[var(--text-ghost)]">
                                        <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No scans yet. Run your first scan above!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ===== RECOMMENDATIONS PANEL ===== */}
                        {scans.length > 0 && (() => {
                            const recsData = scans.map(s => ({
                                prompt: s.prompt,
                                brandName: brandName,
                                brandMentioned: s.brand_mentioned,
                                mentionPosition: s.mention_position,
                                sentiment: s.sentiment,
                                competitorsMentioned: s.competitors_mentioned || [],
                                competitorPositions: [],
                                citations: (s.citations || []).map(c => ({ ...c, isOwnDomain: c.is_own_domain })),
                                platform: s.platform,
                                response: '',
                            }));
                            const recs = generateRecommendations(recsData, brandName);
                            if (recs.length === 0) return null;

                            return (
                                <Card className="border-indigo-500/20 bg-gradient-to-br from-zinc-900 to-zinc-900/50">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Lightbulb className="w-5 h-5 text-yellow-400" />
                                            Recommendations
                                            <Badge variant="outline" className="text-xs ml-2">
                                                {recs.length} action{recs.length > 1 ? 's' : ''}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {recs.map(rec => (
                                            <div
                                                key={rec.id}
                                                className={cn(
                                                    "p-4 rounded-xl border transition-all",
                                                    PRIORITY_CONFIG[rec.priority].bgColor
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm">{CATEGORY_CONFIG[rec.category].icon}</span>
                                                            <span className={cn("text-xs font-medium uppercase tracking-wider", PRIORITY_CONFIG[rec.priority].color)}>
                                                                {PRIORITY_CONFIG[rec.priority].label}
                                                            </span>
                                                            {rec.metric && (
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[var(--border-default)]">
                                                                    {rec.metric}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h4 className="font-semibold text-[var(--text-primary)] mb-1">{rec.title}</h4>
                                                        <p className="text-sm text-[var(--text-secondary)] mb-2">{rec.description}</p>
                                                        <div className="flex items-start gap-2 text-sm">
                                                            <span className="text-indigo-400 font-medium flex-shrink-0">Action:</span>
                                                            <span className="text-[var(--text-secondary)]">{rec.action}</span>
                                                        </div>
                                                    </div>
                                                    {rec.link && (
                                                        <Link href={rec.link}>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-shrink-0 border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]"
                                                            >
                                                                {rec.linkLabel || 'Go'}
                                                                <ArrowRight className="w-3 h-3 ml-1" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })()}

                        {/* Tracked Prompts */}
                        {scans.length > 0 && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Tracked Prompts</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Object.values(groupedScans).slice(0, 6).map((item, i) => {
                                            const visibility = item.brandMentioned
                                                ? (item.mentionPosition === 1 ? 90 : item.mentionPosition && item.mentionPosition <= 3 ? 70 : 50)
                                                : 0;

                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "p-4 rounded-lg border transition-colors cursor-pointer",
                                                        getScoreBgColor(visibility)
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={cn("text-2xl font-bold", getScoreColor(visibility))}>
                                                            {visibility}%
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => setNewPrompt(item.prompt)}
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-sm text-[var(--text-secondary)] mb-1 line-clamp-2">"{item.prompt}"</p>
                                                    <p className="text-xs text-[var(--text-ghost)]">
                                                        Last scan: {formatDistanceToNow(new Date(item.scannedAt), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="schedules" className="mt-0">
                        <ScheduledScans platformsMap={platforms} />
                    </TabsContent>

                    <TabsContent value="variants" className="mt-0">
                        <QuestionVariants />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
