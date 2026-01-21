"use client";

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
} from "lucide-react";

// Mock data
const visibilityTrend = [
    { month: "Aug", score: 45 },
    { month: "Sep", score: 52 },
    { month: "Oct", score: 58 },
    { month: "Nov", score: 65 },
    { month: "Dec", score: 68 },
    { month: "Jan", score: 72 },
];

const shareOfVoice = [
    { brand: "Dylect", percentage: 28, color: "bg-violet-500" },
    { brand: "Qubo", percentage: 24, color: "bg-blue-500" },
    { brand: "Portronics", percentage: 18, color: "bg-green-500" },
    { brand: "Bosch", percentage: 15, color: "bg-orange-500" },
    { brand: "Others", percentage: 15, color: "bg-zinc-500" },
];

const platformStats = [
    { platform: "ChatGPT", mentions: 45, sentiment: 78, trend: 12 },
    { platform: "Gemini", mentions: 32, sentiment: 82, trend: 8 },
    { platform: "Perplexity", mentions: 28, sentiment: 71, trend: -3 },
    { platform: "Reddit", mentions: 156, sentiment: 68, trend: 15 },
];

export default function AnalyticsPage() {
    return (
        <>
            <Header
                title="Analytics"
                description="Track your AEO performance over time"
            />

            <div className="p-6 space-y-6">
                {/* Date Range & Export */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Calendar className="w-4 h-4 mr-2" />
                            Last 30 Days
                        </Button>
                    </div>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: "Total LLM Mentions", value: "156", change: "+23%", icon: Eye, positive: true },
                        { label: "Forum Engagements", value: "42", change: "+18%", icon: MessageSquare, positive: true },
                        { label: "Content Analyzed", value: "28", change: "+5", icon: FileText, positive: true },
                        { label: "Share of Voice", value: "28%", change: "+4%", icon: BarChart3, positive: true },
                    ].map((metric, i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <metric.icon className="w-5 h-5 text-zinc-500" />
                                    <span className={cn(
                                        "text-xs flex items-center gap-1",
                                        metric.positive ? "text-green-400" : "text-red-400"
                                    )}>
                                        {metric.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        {metric.change}
                                    </span>
                                </div>
                                <div className="text-2xl font-bold text-zinc-100">{metric.value}</div>
                                <p className="text-xs text-zinc-500">{metric.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visibility Trend Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Visibility Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-48 flex items-end justify-between gap-2">
                                {visibilityTrend.map((item, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg transition-all hover:from-violet-500 hover:to-violet-300"
                                            style={{ height: `${item.score * 1.5}px` }}
                                        />
                                        <span className="text-xs text-zinc-500">{item.month}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-zinc-400">6 month trend</span>
                                <span className="text-green-400 flex items-center gap-1">
                                    <TrendingUp className="w-4 h-4" />
                                    +27 points
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Share of Voice */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Share of Voice</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {shareOfVoice.map((item, i) => (
                                    <div key={i}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-zinc-300">{item.brand}</span>
                                            <span className="text-sm font-medium text-zinc-100">{item.percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all", item.color)}
                                                style={{ width: `${item.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Platform Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Platform Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                                        <th className="pb-3 font-medium">Platform</th>
                                        <th className="pb-3 font-medium">Mentions</th>
                                        <th className="pb-3 font-medium">Avg Sentiment</th>
                                        <th className="pb-3 font-medium">Trend</th>
                                        <th className="pb-3 font-medium"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {platformStats.map((platform, i) => (
                                        <tr key={i} className="border-b border-zinc-800/50">
                                            <td className="py-4 text-sm font-medium text-zinc-200">
                                                {platform.platform}
                                            </td>
                                            <td className="py-4 text-sm text-zinc-400">
                                                {platform.mentions}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full",
                                                                platform.sentiment >= 75 ? "bg-green-500" :
                                                                    platform.sentiment >= 50 ? "bg-yellow-500" : "bg-red-500"
                                                            )}
                                                            style={{ width: `${platform.sentiment}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-zinc-400">{platform.sentiment}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className={cn(
                                                    "text-xs flex items-center gap-1",
                                                    platform.trend > 0 ? "text-green-400" : "text-red-400"
                                                )}>
                                                    {platform.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                    {platform.trend > 0 ? "+" : ""}{platform.trend}%
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <Button variant="ghost" size="sm">
                                                    Details
                                                    <ArrowRight className="w-3 h-3 ml-1" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
