"use client";
import { waitForMeasurementJob } from '@/lib/client/wait-for-measurement';

import { useState, useEffect } from "react";
import { UpgradeModal, isPlanGate } from '@/components/billing/upgrade-modal';
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getScoreColor, getScoreBgColor } from "@/lib/utils";
import { useWorkspaceLive } from "@/hooks/use-workspace-live";
import { ScheduledScans } from "@/components/dashboard/llm-tracker/scheduled-scans";
import { QuestionVariants } from "@/components/dashboard/llm-tracker/question-variants";
import { ScanReceiptDrawer } from "@/components/dashboard/scan-receipt-drawer";
import {
    Search,
    Sparkles,
    Bot,
    RefreshCw,
    Eye,
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
import { groupRecentScans } from "@/lib/measurement/scan-groups";
import type { LLMScan } from "@/lib/types";

// Engine names stay neutral; status and evidence carry the visual meaning.
const platforms = [
    { id: "chatgpt", name: "ChatGPT" },
    { id: "gemini", name: "Gemini" },
    { id: "perplexity", name: "Perplexity" },
    { id: "claude", name: "Claude" },
    { id: "google_ai_overview", name: "AI Overview" },
];

interface PlatformVisibility {
    platform: string;
    score: number | null;
    change: number | null;
    changeStatus: "comparable" | "incompatible" | "insufficient_samples";
    scanCount: number;
    mentionCount: number;
    mentionRate: number | null;
    confidence: {
        level: "none" | "low" | "medium" | "high";
    };
}

interface WorkspaceSummary {
    id: string;
    name?: string;
    settings?: { competitors?: string[] };
}

interface PlatformError {
    platform: string;
    error: string;
}

export default function LLMTrackerPage() {
    const [newPrompt, setNewPrompt] = useState("");
    const [brandName, setBrandName] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState<{ completed: number; requested: number } | null>(null);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["gemini"]);
    const [scans, setScans] = useState<LLMScan[]>([]);
    const [visibilityMetrics, setVisibilityMetrics] = useState<PlatformVisibility[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gateOpen, setGateOpen] = useState(false);
    const [gateMessage, setGateMessage] = useState<string | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const isLive = useWorkspaceLive(() => void fetchData());
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [newCompetitor, setNewCompetitor] = useState("");
    const [expandedScan, setExpandedScan] = useState<number | null>(null);
    const [scanRegion, setScanRegion] = useState<string>("global");
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptPlatform, setReceiptPlatform] = useState<{ id: string; name: string; score: number | null } | null>(null);

    const REGIONS = [
        { id: "global", label: "Global",  context: "" },
        { id: "us",     label: "US",      context: "Respond as if answering from the United States in English. " },
        { id: "in",     label: "India",   context: "Respond as if answering from India in English. " },
        { id: "uk",     label: "UK",      context: "Respond as if answering from the United Kingdom in English. " },
        { id: "de",     label: "Germany", context: "Respond as if answering from Germany in German (Deutsch). " },
        { id: "es",     label: "Spain",   context: "Respond as if answering from Spain in Spanish (Español). " },
    ];

    // Fetch data function
    async function fetchData() {
        try {
            setError(null);

            const [scansRes, statsRes] = await Promise.all([
                fetch('/api/llm/scans?limit=20', { cache: 'no-store' }),
                fetch('/api/dashboard/stats', { cache: 'no-store' }),
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
            const [wsRes, activeRes] = await Promise.all([
                fetch("/api/workspaces", { cache: "no-store" }),
                fetch("/api/onboarding/context", { cache: "no-store" }),
            ]);
            let activeId = null;
            if (activeRes.ok) activeId = (await activeRes.json()).workspaceId;
            if (wsRes.ok && activeId) {
                const data = await wsRes.json() as { workspaces?: WorkspaceSummary[] };
                const activeWs = data.workspaces?.find((ws) => ws.id === activeId);
                if (activeWs) {
                    if (activeWs.name) setBrandName(activeWs.name);
                    if (activeWs.settings?.competitors) setCompetitors(activeWs.settings.competitors);
                }
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
        }
        init();

    }, []);

    const handleScan = async () => {
        if (!newPrompt.trim() || !brandName.trim()) return;

        setIsScanning(true);
        setScanProgress(null);
        setScanError(null);

        try {
            const response = await fetch('/api/llm/scans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Prefer: 'respond-async',
                },
                body: JSON.stringify({
                    prompt: (REGIONS.find(r => r.id === scanRegion)?.context || '') + newPrompt,
                    brandName,
                    platforms: selectedPlatforms,
                    competitors,
                }),
            });

            const data = await response.json() as {
                statusUrl?: string;
                message?: string;
                error?: string;
                platformErrors?: PlatformError[];
            };

            if (!response.ok) {
                // Plan gate: show the human message with an upgrade nudge, not the raw code.
                if (isPlanGate(response, data)) {
                    setGateMessage(data?.message ?? null);
                    setGateOpen(true);
                    return;
                }
                const errMsg = data.platformErrors
                    ? `Some platforms failed: ${data.platformErrors.map((e) => `${e.platform} (${e.error})`).join(', ')}`
                    : data.message || data.error || 'Scan failed';
                throw new Error(errMsg);
            }

            if (response.status === 202) {
                if (!data.statusUrl) throw new Error('Scan queued, but its progress link is missing. Reload to check saved results.');
                const result = await waitForMeasurementJob(data.statusUrl, (progress) => {
                    setScanProgress({ completed: progress.succeeded + progress.failed, requested: progress.requested });
                });
                if (result.status === 'partial') setScanError('Some engine samples failed. Review sample counts and saved evidence.');
            }

            // Show partial failures as warnings
            if (data.platformErrors && data.platformErrors.length > 0) {
                setScanError(`Partial success, ${data.platformErrors.map((e) => `${e.platform} failed`).join(', ')}`);
            }

            setNewPrompt("");
            await fetchData();
        } catch (err) {
            console.error('Scan error:', err);
            setScanError(err instanceof Error ? err.message : 'Failed to run scan. Please check your API keys.');
        } finally {
            setIsScanning(false);
            setScanProgress(null);
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

    const scanGroups = groupRecentScans(scans).slice(0, 10);
    const latestPromptGroups = scanGroups.filter((group, index, groups) =>
        groups.findIndex((candidate) => candidate.prompt === group.prompt) === index,
    );

    return (
        <>
            <UpgradeModal
                open={gateOpen}
                onClose={() => setGateOpen(false)}
                feature="Multi-engine scanning"
                message={gateMessage ?? undefined}
            />

            <Header
                title="Prompts & Scans"
                description="Run repeatable measurements and inspect every answer"
            />

            <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16 lg:py-12">
                {error && (
                    <div className="mb-4 rounded-md border border-[var(--data-red)]/30 bg-[var(--data-red-muted)] px-4 py-3 text-sm text-[var(--data-red)]">
                        {error}
                    </div>
                )}
                <Tabs defaultValue="manual" className="space-y-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <TabsList className="grid h-auto min-w-0 w-full grid-cols-3 border-[var(--border-default)] bg-[var(--bg-raised)] sm:inline-flex sm:h-9 sm:w-auto">
                            <TabsTrigger value="manual" className="min-w-0 px-2 data-[state=active]:bg-[var(--accent-base)] data-[state=active]:text-[var(--text-on-accent)] sm:px-3">
                                <Search className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                                <span className="sm:hidden">Scan</span><span className="hidden sm:inline">Manual Scan</span>
                            </TabsTrigger>
                            <TabsTrigger value="schedules" className="min-w-0 px-2 data-[state=active]:bg-[var(--accent-base)] data-[state=active]:text-[var(--text-on-accent)] sm:px-3">
                                <Bot className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                                <span className="sm:hidden">Schedule</span><span className="hidden sm:inline">Scheduled Scans</span>
                            </TabsTrigger>
                            <TabsTrigger value="variants" className="min-w-0 px-2 data-[state=active]:bg-[var(--accent-base)] data-[state=active]:text-[var(--text-on-accent)] sm:px-3">
                                <Layers className="mr-1 h-3.5 w-3.5 shrink-0 sm:mr-2 sm:h-4 sm:w-4" />
                                <span className="sm:hidden">Variants</span><span className="hidden sm:inline">Question Variants</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Live indicator */}
                        {isLive && (
                            <div className="flex items-center gap-2 text-xs text-[var(--data-green)] mt-2 sm:mt-0">
                                <Radio className="w-3 h-3 animate-pulse" />
                                <span>Auto-refresh connected</span>
                            </div>
                        )}
                    </div>

                    <TabsContent value="manual" className="space-y-6 mt-0">

                        {/* Visibility Overview */}
                        <section aria-labelledby="engine-measurements-title" className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
                            <div className="flex flex-col justify-between gap-2 border-b border-[var(--border-default)] px-5 py-4 sm:flex-row sm:items-end">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Comparable engine evidence</p>
                                    <h2 id="engine-measurements-title" className="mt-1 text-base font-medium text-[var(--text-primary)]">Visibility by engine</h2>
                                </div>
                                <p className="text-xs text-[var(--text-tertiary)]">Open any row to inspect its provider receipts</p>
                            </div>
                            {loading ? (
                                <div className="divide-y divide-[var(--border-default)]">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="grid min-h-16 grid-cols-[1fr_5rem] items-center gap-4 px-5 py-3 sm:grid-cols-[1fr_7rem_8rem_5rem]">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="hidden h-3 w-16 sm:block" />
                                        <Skeleton className="hidden h-3 w-24 sm:block" />
                                        <Skeleton className="h-7 w-14" />
                                    </div>
                                ))
                                }</div>
                            ) : (
                                <div className="divide-y divide-[var(--border-default)]">
                                {platforms.map((platform) => {
                                    const metrics = visibilityMetrics.find(
                                        m => m.platform.toLowerCase() === platform.id
                                    );
                                    const score = metrics?.score ?? null;
                                    const change = metrics?.change ?? null;

                                    return (
                                        <button
                                            type="button"
                                            key={platform.id}
                                            className="grid min-h-16 w-full grid-cols-[1fr_5rem] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-[var(--bg-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-base)] sm:grid-cols-[1fr_7rem_8rem_5rem]"
                                            onClick={() => {
                                                setReceiptPlatform({ id: platform.id, name: platform.name, score });
                                                setReceiptOpen(true);
                                            }}
                                        >
                                            <span className="flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]"><span className={metrics?.scanCount ? "h-1.5 w-1.5 rounded-full bg-[var(--data-green)]" : "h-1.5 w-1.5 rounded-full bg-[var(--text-ghost)]"} />{platform.name}</span>
                                            <span className="hidden text-xs text-[var(--text-tertiary)] sm:block">n={metrics?.scanCount ?? 0}</span>
                                            <span className="hidden text-xs text-[var(--text-secondary)] sm:block">{metrics?.confidence.level ?? "none"} confidence</span>
                                            <span className="text-right text-2xl font-medium text-[var(--text-primary)]">{score === null ? "—" : `${score}%`}</span>
                                            <span className="col-span-2 text-xs text-[var(--text-tertiary)] sm:col-span-4">
                                                {change === null ? "Matched baseline needed" : `${change > 0 ? "+" : ""}${change} points vs matched baseline`}
                                                <span className="sm:hidden"> · n={metrics?.scanCount ?? 0}</span>
                                                {metrics?.mentionRate !== null && metrics?.mentionRate !== undefined ? ` · ${Math.round(metrics.mentionRate * 100)}% mention rate` : ""}
                                            </span>
                                        </button>
                                    );
                                })}</div>
                            )}
                        </section>

                        {/* New Scan */}
                        <Card className="border-[var(--border-active)]">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-[var(--accent-base)]" />
                                    Run a measurement
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
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
                                        className="w-full"
                                    />
                                    <Button
                                        onClick={handleScan}
                                        disabled={isScanning || !newPrompt.trim() || !brandName.trim()}
                                    >
                                        {isScanning ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                {scanProgress
                                                    ? `${scanProgress.completed} of ${scanProgress.requested} saved…`
                                                    : 'Starting measurement…'}
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
                                    <div className="flex items-center gap-2 text-[var(--data-red)] text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {scanError}
                                    </div>
                                )}

                                <div className="flex items-start gap-2">
                                    <span className="pt-2 text-sm text-[var(--text-secondary)]">Platforms:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {platforms.map((platform) => (
                                            <button
                                                key={platform.id}
                                                onClick={() => togglePlatform(platform.id)}
                                                aria-pressed={selectedPlatforms.includes(platform.id)}
                                                className={cn(
                                                    "flex min-h-10 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                                                    selectedPlatforms.includes(platform.id)
                                                        ? "bg-[var(--bg-raised)] text-[var(--text-primary)] border border-[var(--border-hover)]"
                                                        : "bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]"
                                                )}
                                            >
                                                <div className="h-2 w-2 rounded-full bg-[var(--accent-base)]" />
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
                                                aria-pressed={scanRegion === region.id}
                                                className={cn(
                                                    "min-h-10 rounded-lg px-2.5 py-1 text-xs transition-colors",
                                                    scanRegion === region.id
                                                        ? "bg-[var(--bg-raised)] text-[var(--text-primary)] border border-[var(--border-hover)]"
                                                        : "bg-[var(--bg-raised)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]"
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
                                                <button aria-label={`Remove ${c}`} onClick={() => setCompetitors(prev => prev.filter(x => x !== c))} className="text-[var(--text-secondary)] hover:text-[var(--data-red)]">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <span className="text-xs text-[var(--text-secondary)]">None, add in Settings or inline</span>
                                    )}
                                    <div className="flex gap-1">
                                        <Input
                                            placeholder="Add..."
                                            value={newCompetitor}
                                            onChange={(e) => setNewCompetitor(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCompetitorTag()}
                                            className="h-7 w-28 text-xs"
                                        />
                                        <Button aria-label="Add competitor" variant="ghost" size="icon" className="h-7 w-7" onClick={addCompetitorTag} disabled={!newCompetitor.trim()}>
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
                                                key={scan.key}
                                                className="rounded-lg bg-[var(--bg-raised)] p-4"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Bot className="w-4 h-4 text-[var(--text-ghost)]" />
                                                            <p className="font-medium text-[var(--text-primary)] truncate">
                                                                &ldquo;{scan.prompt}&rdquo;
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                                            <div className="flex items-center gap-1">
                                                                {scan.platforms.map((pid) => {
                                                                    const p = platforms.find(x => x.id === pid);
                                                                    return (
                                                                        <div
                                                                            key={pid}
                                                                            className="h-2 w-2 rounded-full bg-[var(--accent-base)]"
                                                                            title={p?.name}
                                                                        />
                                                                    );
                                                                })}
                                                                <span className="ml-1 text-[var(--text-tertiary)]">
                                                                    {scan.platforms.length} engine{scan.platforms.length > 1 ? 's' : ''}
                                                                </span>
                                                            </div>

                                                            {scan.mentionCount > 0 ? (
                                                                <div className="flex items-center gap-1 text-[var(--data-green)]">
                                                                    <Eye className="w-3 h-3" />
                                                                    {scan.mentionCount}/{scan.sampleCount} mentioned
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-[var(--data-red)]">
                                                                    <Eye className="w-3 h-3" />
                                                                    0/{scan.sampleCount} mentioned
                                                                </div>
                                                            )}

                                                            <span className="text-[var(--text-tertiary)]">
                                                                {scan.visibilityPercent === null ? 'Unmeasured' : `${scan.visibilityPercent}% visibility`} · {scan.confidence.level} confidence
                                                            </span>

                                                            {scan.competitors.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                                                                    <Users className="w-3 h-3" />
                                                                    {scan.competitors.join(", ")}
                                                                </div>
                                                            )}

                                                            {scan.citations.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                                                                    <Link2 className="w-3 h-3" />
                                                                    {scan.citations.length} source{scan.citations.length > 1 ? 's' : ''}
                                                                </div>
                                                            )}

                                                            {scan.failedSamples > 0 && <span className="text-[var(--data-red)]">{scan.failedSamples} failed sample{scan.failedSamples > 1 ? 's' : ''}</span>}

                                                            <span className="text-[var(--text-tertiary)]">
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
                                                            aria-label={expandedScan === index ? `Collapse evidence for ${scan.prompt}` : `Expand evidence for ${scan.prompt}`}
                                                            aria-expanded={expandedScan === index}
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
                                                                    <Link2 className="w-3 h-3" /> Evidence links
                                                                </p>
                                                                <div className="space-y-1">
                                                                    {scan.citations.map((citation, ci) => (
                                                                        <div key={ci} className="flex items-center gap-2 text-xs">
                                                                            <Globe className="w-3 h-3 text-[var(--text-ghost)] flex-shrink-0" />
                                                                            {citation.fetch_validation === 'invalid' || citation.fetch_validation === 'blocked' ? (
                                                                                <span className="text-[var(--text-tertiary)] truncate">
                                                                                    {citation.title || citation.url}
                                                                                </span>
                                                                            ) : (
                                                                                <a
                                                                                    href={citation.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-[var(--accent-base)] hover:text-[var(--accent-base)] truncate"
                                                                                >
                                                                                    {citation.title || citation.url}
                                                                                </a>
                                                                            )}
                                                                            {citation.is_own_domain && (
                                                                                <Badge variant="default" className="text-[10px] px-1.5 py-0">Your Site</Badge>
                                                                            )}
                                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                                {citation.provenance === 'provider_citation'
                                                                                    ? 'Provider citation'
                                                                                    : citation.provenance === 'link_mentioned'
                                                                                        ? 'Link mentioned'
                                                                                        : 'Unverified'}
                                                                            </Badge>
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
                                    <div className="py-12 text-center text-[var(--text-secondary)]">
                                        <Search aria-hidden="true" className="mx-auto mb-3 h-12 w-12 text-[var(--text-ghost)]" />
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
                                <Card className="border-[var(--accent-base)]/25 bg-[var(--bg-surface)]">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Lightbulb className="w-5 h-5 text-[var(--data-amber)]" />
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
                                                    "rounded-xl border p-4 transition-colors",
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
                                                            <span className="text-[var(--accent-base)] font-medium flex-shrink-0">Action:</span>
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
                                        {latestPromptGroups.slice(0, 6).map((item) => {
                                            const visibility = item.visibilityPercent;

                                            return (
                                                <div
                                                    key={item.key}
                                                    className={cn(
                                                        "rounded-lg border p-4 transition-colors",
                                                        getScoreBgColor(visibility ?? 0)
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={cn("text-2xl font-bold", getScoreColor(visibility ?? 0))}>
                                                            {visibility === null ? '—' : `${visibility}%`}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            aria-label={`Run ${item.prompt} again`}
                                                            onClick={() => setNewPrompt(item.prompt)}
                                                        >
                                                            <RefreshCw className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <p className="text-sm text-[var(--text-secondary)] mb-1 line-clamp-2">&ldquo;{item.prompt}&rdquo;</p>
                                                    <p className="text-xs text-[var(--text-tertiary)]">
                                                        Latest run: {item.mentionCount}/{item.sampleCount} mentions · {item.confidence.level} confidence · {formatDistanceToNow(new Date(item.scannedAt), { addSuffix: true })}
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
            </main>

            <ScanReceiptDrawer
                open={receiptOpen}
                onOpenChange={setReceiptOpen}
                title={receiptPlatform ? `${receiptPlatform.name} visibility · ${receiptPlatform.score === null ? "unmeasured" : `${receiptPlatform.score}/100`}` : "Scans"}
                subtitle={receiptPlatform ? `Every scan that produced this ${receiptPlatform.name} score, most recent first. Verify any of them yourself.` : undefined}
                platform={receiptPlatform?.id}
            />
        </>
    );
}
