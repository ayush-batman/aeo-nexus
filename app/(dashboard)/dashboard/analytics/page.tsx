"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Eye,
    MessageSquare,
    FileText,
    Download,
    Calendar,
    ArrowRight,
    Loader2,
    AlertCircle,
    RefreshCw,
    Link2,
    Globe,
    Users,
    Swords,
    PieChart,
    Activity,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { motion } from "framer-motion";

// Framer Motion Variants
const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface PlatformVisibility {
    platform: string;
    score: number;
    change: number;
    scanCount: number;
}

interface LLMScan {
    id: string;
    platform: string;
    prompt: string;
    brand_mentioned: boolean;
    sentiment: "positive" | "neutral" | "negative" | null;
    competitors_mentioned: string[] | null;
    citations: { url: string; title: string; is_own_domain: boolean }[] | null;
    created_at: string;
}

interface DashboardStats {
    aeoHealthScore: number;
    aeoScoreChange: number;
    llmVisibility: number;
    llmVisibilityChange: number;
    forumThreadCount: number;
    highPriorityThreads: number;
    shareOfVoice: number;
    shareOfVoiceChange: number;
    contentScore: number;
    pagesNeedingOptimization: number;
}

type TimeRange = "7d" | "30d" | "90d" | "all";

const DONUT_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"];
const TREND_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [visibilityMetrics, setVisibilityMetrics] = useState<PlatformVisibility[]>([]);
    const [scans, setScans] = useState<LLMScan[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>("30d");
    const [exporting, setExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        try {
            setError(null);

            const [statsRes, scansRes] = await Promise.all([
                fetch("/api/dashboard/stats"),
                fetch("/api/llm/scans?limit=200"),
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData.stats);
                setVisibilityMetrics(statsData.visibilityMetrics || []);
            }

            if (scansRes.ok) {
                const scansData = await scansRes.json();
                setScans(scansData.scans || []);
            }
        } catch (err) {
            console.error("Error fetching analytics:", err);
            setError("Failed to load analytics data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter scans by time range
    const filteredScans = (() => {
        if (timeRange === "all") return scans;
        const now = new Date();
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        return scans.filter(s => new Date(s.created_at) >= cutoff);
    })();

    // ================================================================
    // HISTORICAL TREND DATA — aggregate scans by day
    // ================================================================
    const trendData = (() => {
        if (filteredScans.length === 0) return [];

        const dayMap: Record<string, {
            date: string;
            totalScans: number;
            mentions: number;
            positive: number;
            negative: number;
            neutral: number;
            platforms: Record<string, { total: number; mentions: number }>;
        }> = {};

        filteredScans.forEach(scan => {
            const date = new Date(scan.created_at).toISOString().split("T")[0];
            if (!dayMap[date]) {
                dayMap[date] = { date, totalScans: 0, mentions: 0, positive: 0, negative: 0, neutral: 0, platforms: {} };
            }
            dayMap[date].totalScans++;
            if (scan.brand_mentioned) dayMap[date].mentions++;
            if (scan.sentiment === "positive") dayMap[date].positive++;
            else if (scan.sentiment === "negative") dayMap[date].negative++;
            else if (scan.sentiment === "neutral") dayMap[date].neutral++;

            if (!dayMap[date].platforms[scan.platform]) {
                dayMap[date].platforms[scan.platform] = { total: 0, mentions: 0 };
            }
            dayMap[date].platforms[scan.platform].total++;
            if (scan.brand_mentioned) dayMap[date].platforms[scan.platform].mentions++;
        });

        return Object.values(dayMap)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(day => {
                const row: Record<string, any> = {
                    date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    rawDate: day.date,
                    visibility: day.totalScans > 0 ? Math.round((day.mentions / day.totalScans) * 100) : 0,
                    scans: day.totalScans,
                    mentions: day.mentions,
                    sentimentScore: day.totalScans > 0
                        ? Math.round(((day.positive * 1 + day.neutral * 0.5) / day.totalScans) * 100)
                        : 0,
                };
                // Per-platform visibility
                for (const [platform, data] of Object.entries(day.platforms)) {
                    row[platform] = data.total > 0 ? Math.round((data.mentions / data.total) * 100) : 0;
                }
                return row;
            });
    })();

    // Unique platforms found in trend data for per-platform chart
    const trendPlatforms = (() => {
        const platformSet = new Set<string>();
        filteredScans.forEach(s => platformSet.add(s.platform));
        return Array.from(platformSet);
    })();

    // Week-over-week comparison
    const weekComparison = (() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeek = scans.filter(s => new Date(s.created_at) >= oneWeekAgo);
        const lastWeek = scans.filter(s => {
            const d = new Date(s.created_at);
            return d >= twoWeeksAgo && d < oneWeekAgo;
        });

        const thisWeekVis = thisWeek.length > 0 ? Math.round((thisWeek.filter(s => s.brand_mentioned).length / thisWeek.length) * 100) : 0;
        const lastWeekVis = lastWeek.length > 0 ? Math.round((lastWeek.filter(s => s.brand_mentioned).length / lastWeek.length) * 100) : 0;

        const thisWeekSentiment = thisWeek.length > 0
            ? Math.round(((thisWeek.filter(s => s.sentiment === "positive").length + thisWeek.filter(s => s.sentiment === "neutral").length * 0.5) / thisWeek.length) * 100)
            : 0;
        const lastWeekSentiment = lastWeek.length > 0
            ? Math.round(((lastWeek.filter(s => s.sentiment === "positive").length + lastWeek.filter(s => s.sentiment === "neutral").length * 0.5) / lastWeek.length) * 100)
            : 0;

        return {
            thisWeek: { scans: thisWeek.length, visibility: thisWeekVis, sentiment: thisWeekSentiment },
            lastWeek: { scans: lastWeek.length, visibility: lastWeekVis, sentiment: lastWeekSentiment },
            visChange: thisWeekVis - lastWeekVis,
            sentimentChange: thisWeekSentiment - lastWeekSentiment,
            scanChange: thisWeek.length - lastWeek.length,
        };
    })();

    // Compute platform breakdown from filtered scans
    const platformBreakdown = (() => {
        const platforms: Record<string, { mentions: number; positive: number; neutral: number; negative: number; total: number }> = {};

        filteredScans.forEach((scan) => {
            if (!platforms[scan.platform]) {
                platforms[scan.platform] = { mentions: 0, positive: 0, neutral: 0, negative: 0, total: 0 };
            }
            platforms[scan.platform].total++;
            if (scan.brand_mentioned) platforms[scan.platform].mentions++;
            if (scan.sentiment === "positive") platforms[scan.platform].positive++;
            else if (scan.sentiment === "neutral") platforms[scan.platform].neutral++;
            else if (scan.sentiment === "negative") platforms[scan.platform].negative++;
        });

        return Object.entries(platforms).map(([platform, data]) => ({
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            mentions: data.mentions,
            sentiment: data.total > 0 ? Math.round(((data.positive + data.neutral * 0.5) / data.total) * 100) : 0,
            mentionRate: data.total > 0 ? Math.round((data.mentions / data.total) * 100) : 0,
            totalScans: data.total,
        }));
    })();

    // Competitive Share of Voice (Donut Chart data)
    const competitiveSOV = (() => {
        if (filteredScans.length === 0) return { brand: 0, competitors: [] as { name: string; mentions: number; percentage: number }[], brandMentions: 0, totalScans: filteredScans.length, donutData: [] as { name: string; value: number }[] };

        let brandMentions = 0;
        const compMap: Record<string, number> = {};

        filteredScans.forEach(scan => {
            if (scan.brand_mentioned) brandMentions++;
            if (scan.competitors_mentioned) {
                scan.competitors_mentioned.forEach(c => {
                    compMap[c] = (compMap[c] || 0) + 1;
                });
            }
        });

        const totalMentions = brandMentions + Object.values(compMap).reduce((a, b) => a + b, 0);
        const competitors = Object.entries(compMap)
            .map(([name, mentions]) => ({
                name,
                mentions,
                percentage: totalMentions > 0 ? Math.round((mentions / totalMentions) * 100) : 0,
            }))
            .sort((a, b) => b.mentions - a.mentions);

        const donutData = [
            { name: "Your Brand", value: brandMentions },
            ...competitors.map(c => ({ name: c.name, value: c.mentions })),
        ];

        return {
            brand: totalMentions > 0 ? Math.round((brandMentions / totalMentions) * 100) : 0,
            brandMentions,
            totalScans: filteredScans.length,
            competitors,
            donutData,
        };
    })();

    // Top Cited Sources
    const topCitations = (() => {
        const domainMap: Record<string, { count: number; isOwnDomain: boolean; urls: Set<string> }> = {};

        filteredScans.forEach(scan => {
            if (scan.citations) {
                scan.citations.forEach(c => {
                    const domain = c.title || c.url;
                    if (!domainMap[domain]) {
                        domainMap[domain] = { count: 0, isOwnDomain: c.is_own_domain, urls: new Set() };
                    }
                    domainMap[domain].count++;
                    domainMap[domain].urls.add(c.url);
                });
            }
        });

        return Object.entries(domainMap)
            .map(([domain, data]) => ({
                domain,
                count: data.count,
                isOwnDomain: data.isOwnDomain,
                uniqueUrls: data.urls.size,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    })();

    const citationRate = (() => {
        if (filteredScans.length === 0) return 0;
        const scansWithOwnCitation = filteredScans.filter(s => s.citations?.some(c => c.is_own_domain)).length;
        return Math.round((scansWithOwnCitation / filteredScans.length) * 100);
    })();

    const hasData = scans.length > 0 || (stats && stats.aeoHealthScore > 0);

    // ================================================================
    // EXPORT FUNCTIONS
    // ================================================================
    const exportCSV = () => {
        const headers = ["Date", "Platform", "Prompt", "Brand Mentioned", "Sentiment", "Competitors"];
        const rows = filteredScans.map(s => [
            new Date(s.created_at).toISOString(),
            s.platform,
            `"${s.prompt.replace(/"/g, '""')}"`,
            s.brand_mentioned ? "Yes" : "No",
            s.sentiment || "N/A",
            s.competitors_mentioned?.join("; ") || "",
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `aeo-analytics-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPDF = async () => {
        setExporting(true);
        try {
            const { default: html2canvas } = await import("html2canvas");
            const { default: jsPDF } = await import("jspdf");

            if (!reportRef.current) return;

            const canvas = await html2canvas(reportRef.current, {
                backgroundColor: "#09090b",
                scale: 2,
                logging: false,
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Header
            pdf.setFillColor(9, 9, 11);
            pdf.rect(0, 0, pdfWidth, 20, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.text("Lumina — Analytics Report", 10, 13);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 10, 18);

            pdf.addImage(imgData, "PNG", 0, 22, pdfWidth, Math.min(pdfHeight, 250));

            pdf.save(`aeo-report-${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (err) {
            console.error("PDF export failed:", err);
        } finally {
            setExporting(false);
        }
    };

    // Custom tooltip for recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 shadow-xl">
                    <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
                    {payload.map((entry: any, i: number) => (
                        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}%
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <>
                <Header title="Analytics" description="Track your AEO performance over time" />
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                        <p className="text-sm text-[var(--text-muted)]">Loading analytics...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                title="Analytics"
                description="Track your AEO performance over time"
            />

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 space-y-8"
                ref={reportRef}
            >
                {/* Date Range & Export */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--background)]/40 p-3 rounded-2xl border border-[var(--border)]/80 backdrop-blur-md">
                    <div className="flex items-center gap-1.5 bg-[var(--surface)] p-1 rounded-xl border border-[var(--border)]/50">
                        {(["7d", "30d", "90d", "all"] as TimeRange[]).map(range => (
                            <Button
                                key={range}
                                variant="ghost"
                                size="sm"
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    "rounded-lg px-4 transition-all duration-300",
                                    timeRange === range
                                        ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-violet-200"
                                        : "text-[var(--text-ghost)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]"
                                )}
                            >
                                {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "All Time"}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={exportCSV} className="bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-white rounded-xl">
                            <FileText className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
                            CSV
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportPDF}
                            disabled={exporting}
                            className="bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-white rounded-xl"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin text-[var(--text-muted)]" />
                            ) : (
                                <Download className="w-4 h-4 mr-2 text-[var(--text-muted)]" />
                            )}
                            PDF Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }} className="bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-elevated)] hover:text-white rounded-xl">
                            <RefreshCw className="w-4 h-4 mr-2 text-indigo-400" />
                            Sync Data
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-300">{error}</p>
                    </div>
                )}

                {!hasData ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <BarChart3 className="w-12 h-12 text-[var(--text-ghost)] mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No Analytics Data Yet</h3>
                            <p className="text-sm text-[var(--text-ghost)] max-w-md mx-auto">
                                Run some LLM scans from the LLM Tracker or discover forum threads to start building your analytics dashboard.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="space-y-8"
                    >
                        {/* ============================================ */}
                        {/* WEEK-OVER-WEEK COMPARISON CARDS               */}
                        {/* ============================================ */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "AEO Health Score",
                                    value: stats?.aeoHealthScore ?? 0,
                                    change: stats?.aeoScoreChange ?? 0,
                                    icon: Eye,
                                    suffix: "",
                                    gradient: "from-indigo-500/10 to-violet-600/10",
                                    iconColor: "text-indigo-400"
                                },
                                {
                                    label: "LLM Visibility",
                                    value: `${stats?.llmVisibility ?? 0}%`,
                                    change: weekComparison.visChange,
                                    icon: TrendingUp,
                                    suffix: "% vs last week",
                                    gradient: "from-emerald-600/10 to-teal-600/10",
                                    iconColor: "text-emerald-400"
                                },
                                {
                                    label: "Sentiment Score",
                                    value: `${weekComparison.thisWeek.sentiment}%`,
                                    change: weekComparison.sentimentChange,
                                    icon: MessageSquare,
                                    suffix: "% vs last week",
                                    gradient: "from-blue-600/10 to-cyan-600/10",
                                    iconColor: "text-blue-400"
                                },
                                {
                                    label: "Total Scans",
                                    value: filteredScans.length,
                                    change: weekComparison.scanChange,
                                    icon: BarChart3,
                                    suffix: " vs last week",
                                    gradient: "from-amber-600/10 to-orange-600/10",
                                    iconColor: "text-amber-400"
                                },
                            ].map((metric, i) => (
                                <motion.div
                                    key={i}
                                    variants={itemVariants}
                                    className="group relative overflow-hidden bg-[var(--background)]/40 border border-[var(--border)]/80 rounded-2xl p-5 backdrop-blur-md"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <div className={`p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] group-hover:scale-110 transition-transform duration-300`}>
                                            <metric.icon className={`w-4 h-4 ${metric.iconColor}`} />
                                        </div>
                                        <span className={cn(
                                            "text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md",
                                            metric.change > 0 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                                metric.change < 0 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border)]/50"
                                        )}>
                                            {metric.change > 0 ? <TrendingUp className="w-3 h-3" /> : metric.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                            {metric.change > 0 ? "+" : ""}{metric.change}{metric.suffix}
                                        </span>
                                    </div>
                                    <div className="relative z-10 space-y-1">
                                        <div className="text-3xl font-bold text-white tracking-tight">{metric.value}</div>
                                        <p className="text-xs text-[var(--text-ghost)] font-medium">{metric.label}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* ============================================ */}
                        {/* VISIBILITY TREND LINE CHART                   */}
                        {/* ============================================ */}
                        <motion.div variants={itemVariants} className="relative group overflow-hidden bg-[var(--background)]/50 border border-[var(--border)]/80 rounded-3xl p-6 backdrop-blur-xl">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                            <div className="flex items-center gap-2 mb-6 relative z-10">
                                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-semibold text-white">Visibility Over Time</h2>
                            </div>

                            <div className="relative z-10">
                                {trendData.length > 1 ? (
                                    <div className="h-[350px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="visGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#52525b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    stroke="#52525b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    domain={[0, 100]}
                                                    tickFormatter={(val) => `${val}%`}
                                                    dx={-10}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                <Area
                                                    type="monotone"
                                                    dataKey="visibility"
                                                    name="Visibility"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={3}
                                                    fill="url(#visGradient)"
                                                    dot={{ r: 4, fill: "#18181b", stroke: "#8b5cf6", strokeWidth: 2 }}
                                                    activeDot={{ r: 6, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="sentimentScore"
                                                    name="Sentiment"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    fill="url(#sentGradient)"
                                                    dot={false}
                                                    activeDot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : trendData.length === 1 ? (
                                    <div className="h-[350px] flex flex-col items-center justify-center bg-[var(--surface)]/20 rounded-xl border border-dashed border-[var(--border)]">
                                        <Eye className="w-10 h-10 mb-4 text-violet-500/50" />
                                        <p className="text-[var(--text-muted)] font-medium">Only 1 day of data recorded</p>
                                        <p className="text-xs text-[var(--text-ghost)] mt-2 max-w-sm text-center">Run more LLM scans over multiple days to populate this high-fidelity trend tracker.</p>
                                        <Badge variant="outline" className="mt-4 bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                                            Current visibility: {trendData[0].visibility}%
                                        </Badge>
                                    </div>
                                ) : (
                                    <div className="h-[350px] flex items-center justify-center bg-[var(--surface)]/20 rounded-xl border border-dashed border-[var(--border)]">
                                        <p className="text-[var(--text-ghost)]">Run scans to visualize trends over time</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* ============================================ */}
                        {/* PER-PLATFORM VISIBILITY TREND LINES           */}
                        {/* ============================================ */}
                        {trendData.length > 1 && trendPlatforms.length > 1 && (
                            <motion.div variants={itemVariants} className="relative group overflow-hidden bg-[var(--background)]/50 border border-[var(--border)]/80 rounded-3xl p-6 backdrop-blur-xl">
                                <div className="flex items-center gap-2 mb-6 relative z-10">
                                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <Activity className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white">Platform Comparison Over Time</h2>
                                </div>
                                <div className="relative z-10">
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#52525b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={10}
                                                />
                                                <YAxis
                                                    stroke="#52525b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    domain={[0, 100]}
                                                    tickFormatter={(val) => `${val}%`}
                                                    dx={-10}
                                                />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                                {trendPlatforms.map((platform, i) => (
                                                    <Line
                                                        key={platform}
                                                        type="monotone"
                                                        dataKey={platform}
                                                        name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                                                        stroke={TREND_COLORS[i % TREND_COLORS.length]}
                                                        strokeWidth={2}
                                                        dot={{ r: 3, fill: "#18181b", stroke: TREND_COLORS[i % TREND_COLORS.length], strokeWidth: 2 }}
                                                        activeDot={{ r: 5, fill: TREND_COLORS[i % TREND_COLORS.length], stroke: "#fff", strokeWidth: 2 }}
                                                        connectNulls
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex items-center justify-center gap-6 mt-4">
                                        {trendPlatforms.map((platform, i) => (
                                            <div key={platform} className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }} />
                                                <span className="text-xs text-[var(--text-muted)] capitalize">{platform}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ============================================ */}
                        {/* COMPETITIVE SOV DONUT + PLATFORM VISIBILITY   */}
                        {/* ============================================ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Competitive Share of Voice - Donut Chart */}
                            <motion.div variants={itemVariants} className="relative bg-[var(--background)]/50 border border-[var(--border)]/80 rounded-3xl p-6 backdrop-blur-xl">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                        <Swords className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white">Share of Voice</h2>
                                </div>
                                <div className="relative">
                                    {competitiveSOV.donutData.length > 0 ? (
                                        <div className="flex flex-col items-center">
                                            <div className="h-64 w-full relative">
                                                <div className="absolute inset-0 flex items-center justify-center flex-col z-0">
                                                    <div className="text-4xl font-black text-white tracking-tight">{competitiveSOV.brand}%</div>
                                                    <p className="text-xs text-[var(--text-ghost)] font-medium tracking-wide uppercase mt-1">Your Brand</p>
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                                                    <RechartsPieChart>
                                                        <Pie
                                                            data={competitiveSOV.donutData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={75}
                                                            outerRadius={95}
                                                            paddingAngle={4}
                                                            dataKey="value"
                                                            stroke="none"
                                                            cornerRadius={4}
                                                        >
                                                            {competitiveSOV.donutData.map((entry, i) => (
                                                                <Cell
                                                                    key={entry.name}
                                                                    fill={i === 0 ? "#10b981" : DONUT_COLORS[(i - 1 + DONUT_COLORS.length) % DONUT_COLORS.length]}
                                                                />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: "rgba(24, 24, 27, 0.9)",
                                                                backdropFilter: "blur(12px)",
                                                                border: "1px solid rgba(63, 63, 70, 0.5)",
                                                                borderRadius: "12px",
                                                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                                                                padding: "12px",
                                                                fontSize: "13px",
                                                            }}
                                                            itemStyle={{ color: "#e4e4e7", fontWeight: 500 }}
                                                        />
                                                    </RechartsPieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                                                {competitiveSOV.donutData.slice(0, 4).map((entry, i) => (
                                                    <div key={entry.name} className="flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded px-2 py-1">
                                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: i === 0 ? "#10b981" : DONUT_COLORS[(i - 1 + DONUT_COLORS.length) % DONUT_COLORS.length] }} />
                                                        <span className={cn("text-xs", i === 0 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]")}>{entry.name}</span>
                                                    </div>
                                                ))}
                                                {competitiveSOV.donutData.length > 4 && (
                                                    <span className="text-xs text-[var(--text-ghost)]">+{competitiveSOV.donutData.length - 4} more</span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center bg-[var(--surface)]/20 rounded-xl border border-dashed border-[var(--border)]">
                                            <p className="text-[var(--text-ghost)]">Add competitors in scans to reveal SOV</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Platform Visibility Scores */}
                            <motion.div variants={itemVariants} className="bg-[var(--background)]/50 border border-[var(--border)]/80 rounded-3xl p-6 backdrop-blur-xl flex flex-col">
                                <div className="flex items-center gap-2 mb-8">
                                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <PieChart className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <h2 className="text-xl font-semibold text-white">Platform Visibility</h2>
                                </div>

                                <div className="flex-1 flex flex-col justify-end">
                                    {visibilityMetrics.length > 0 ? (
                                        <div className="h-[250px] flex items-end justify-between gap-4">
                                            {visibilityMetrics.map((metric, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scaleY: 0 }}
                                                    animate={{ opacity: 1, scaleY: 1 }}
                                                    transition={{ delay: 0.5 + (i * 0.1), duration: 0.8, ease: "easeOut" as const }}
                                                    style={{ transformOrigin: "bottom" }}
                                                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                                                >
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-elevated)] px-2 py-1 rounded text-xs font-bold text-white absolute -mt-10 pointer-events-none">
                                                        {metric.score}%
                                                    </div>
                                                    <div
                                                        className="w-full bg-gradient-to-t from-indigo-500/60 to-violet-400 rounded-t-xl group-hover:from-violet-500 group-hover:to-violet-300 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] relative overflow-hidden"
                                                        style={{ height: `${Math.max(metric.score * 2.2, 12)}px` }}
                                                    >
                                                        {/* Inner glass highlight */}
                                                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl" />
                                                    </div>
                                                    <span className="text-xs font-medium text-[var(--text-muted)] capitalize mt-2 group-hover:text-[var(--text-primary)] transition-colors">{metric.platform}</span>
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                                        metric.change > 0 ? "bg-green-500/20 text-green-400 border border-green-500/10" : metric.change < 0 ? "bg-red-500/20 text-red-400 border border-red-500/10" : "text-[var(--text-ghost)]"
                                                    )}>
                                                        {metric.change > 0 ? "+" : ""}{metric.change}
                                                    </span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : platformBreakdown.length > 0 ? (
                                        <div className="h-[250px] flex items-end justify-between gap-4">
                                            {platformBreakdown.map((p, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scaleY: 0 }}
                                                    animate={{ opacity: 1, scaleY: 1 }}
                                                    transition={{ delay: 0.5 + (i * 0.1), duration: 0.8, ease: "easeOut" as const }}
                                                    style={{ transformOrigin: "bottom" }}
                                                    className="flex-1 flex flex-col items-center gap-2 group"
                                                >
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-elevated)] px-2 py-1 rounded text-xs font-bold text-white absolute -mt-8 pointer-events-none">
                                                        {p.mentionRate}%
                                                    </div>
                                                    <div
                                                        className="w-full bg-gradient-to-t from-indigo-500/60 to-violet-400 rounded-t-xl group-hover:from-violet-500 group-hover:to-violet-300 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.1)] relative overflow-hidden"
                                                        style={{ height: `${Math.max(p.mentionRate * 2.2, 12)}px` }}
                                                    >
                                                        <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl" />
                                                    </div>
                                                    <span className="text-xs font-medium text-[var(--text-ghost)] capitalize group-hover:text-[var(--text-secondary)] transition-colors">{p.platform}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-[250px] flex items-center justify-center bg-[var(--surface)]/20 rounded-xl border border-dashed border-[var(--border)]">
                                            <p className="text-[var(--text-ghost)]">Run scans to see platform visibility rankings</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* ============================================ */}
                        {/* CITATIONS + PLATFORM TABLE                    */}
                        {/* ============================================ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                            {/* ===== CITATION SOURCE DASHBOARD ===== */}
                            <motion.div variants={itemVariants} className="bg-[var(--background)]/50 border border-[var(--border)]/80 rounded-3xl p-6 backdrop-blur-xl lg:col-span-2">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                            <Link2 className="w-5 h-5 text-amber-400" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-white">Citation Source Dashboard</h2>
                                    </div>
                                    {citationRate > 0 && (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/20">
                                            {citationRate}% own-domain citation rate
                                        </Badge>
                                    )}
                                </div>

                                {topCitations.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Citation Rate Overview */}
                                        <div className="space-y-4">
                                            <div className="rounded-2xl bg-gradient-to-br from-amber-600/10 to-zinc-900 border border-amber-500/20 p-5">
                                                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Citation Rate</p>
                                                <div className="text-4xl font-bold text-amber-300">{citationRate}%</div>
                                                <p className="text-xs text-[var(--text-ghost)] mt-2">
                                                    {citationRate > 0 ? 'of LLM responses cite your domain' : 'LLMs are not citing your domain yet'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5">
                                                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Total Citations Found</p>
                                                <div className="text-3xl font-bold text-[var(--text-primary)]">{topCitations.reduce((s, c) => s + c.count, 0)}</div>
                                                <p className="text-xs text-[var(--text-ghost)] mt-2">
                                                    across {topCitations.length} unique sources
                                                </p>
                                            </div>
                                            {citationRate === 0 && (
                                                <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-4">
                                                    <p className="text-xs font-medium text-red-400 mb-1">⚠️ Not being cited</p>
                                                    <p className="text-[11px] text-[var(--text-ghost)]">Create FAQ and original research content to become citeable.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Your Domain Citations */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                                Your Domain ({topCitations.filter(c => c.isOwnDomain).length})
                                            </h3>
                                            {topCitations.filter(c => c.isOwnDomain).length > 0 ? (
                                                topCitations.filter(c => c.isOwnDomain).map((citation) => (
                                                    <div
                                                        key={citation.domain}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Globe className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                            <span className="text-sm text-green-300 truncate">{citation.domain}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-300 border-green-500/20 flex-shrink-0">
                                                            {citation.count}x cited
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 rounded-lg border border-dashed border-[var(--border)] text-center">
                                                    <p className="text-xs text-[var(--text-ghost)]">No pages from your domain have been cited yet</p>
                                                    <p className="text-[10px] text-[var(--text-ghost)] mt-1">Create authoritative content to earn citations</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* External Sources */}
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-zinc-400" />
                                                External Sources ({topCitations.filter(c => !c.isOwnDomain).length})
                                            </h3>
                                            {topCitations.filter(c => !c.isOwnDomain).slice(0, 6).map((citation) => (
                                                <div
                                                    key={citation.domain}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-elevated)]/30"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Globe className="w-4 h-4 text-[var(--text-ghost)] flex-shrink-0" />
                                                        <span className="text-sm text-[var(--text-muted)] truncate">{citation.domain}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                                        {citation.count}x
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-[var(--text-ghost)] text-sm">
                                        No citations found in scans yet — run more scans to discover which sources LLMs cite
                                    </div>
                                )}
                            </motion.div>

                            {/* Platform Performance Table */}
                            {platformBreakdown.length > 0 && (
                                <motion.div variants={itemVariants} className="bg-[var(--background)]/50 border border-[var(--border)]/80 rounded-3xl p-6 backdrop-blur-xl">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/20">
                                            <Activity className="w-5 h-5 text-pink-400" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-white">Platform Performance</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-xs text-[var(--text-ghost)] border-b border-[var(--border)]/80 tracking-wide uppercase">
                                                    <th className="pb-4 font-medium pl-2">Platform</th>
                                                    <th className="pb-4 font-medium">Recorded Scans</th>
                                                    <th className="pb-4 font-medium">Visibility Rate</th>
                                                    <th className="pb-4 font-medium pr-2">Avg Sentiment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {platformBreakdown.map((platform, i) => (
                                                    <tr key={i} className="border-b border-[var(--border)]/30 hover:bg-[var(--surface)] transition-colors">
                                                        <td className="py-4 text-sm font-semibold text-[var(--text-primary)] pl-2">
                                                            {platform.platform}
                                                        </td>
                                                        <td className="py-4 text-sm text-[var(--text-muted)] font-medium font-mono">
                                                            {platform.totalScans}
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "text-xs font-bold px-2 py-1 rounded-md",
                                                                    platform.mentionRate >= 50 ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                                                        platform.mentionRate >= 20 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                                                            "bg-[var(--surface-elevated)] text-[var(--text-muted)]"
                                                                )}>
                                                                    {platform.mentionRate}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 pr-2">
                                                            <div className="w-full max-w-[120px] h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden border border-[var(--border)]/50">
                                                                <div
                                                                    className={cn(
                                                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                                                        platform.sentiment >= 60 ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" :
                                                                            platform.sentiment >= 40 ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" :
                                                                                "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                                                    )}
                                                                    style={{ width: `${platform.sentiment}%` }}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </>
    );
}
