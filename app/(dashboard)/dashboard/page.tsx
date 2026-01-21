import { Header } from "@/components/dashboard/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Eye,
    MessageSquare,
    TrendingUp,
    FileText,
    ArrowRight,
    Zap,
    Search,
    BarChart3,
} from "lucide-react";

export default function DashboardPage() {
    return (
        <>
            <Header
                title="Dashboard"
                description="Your AEO performance at a glance"
            />

            <div className="p-6 space-y-6">
                {/* AEO Health Score */}
                <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-violet-600/10 via-indigo-600/10 to-zinc-900 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-400 mb-1">AEO Health Score</p>
                            <div className="flex items-baseline gap-3">
                                <span className="text-5xl font-bold text-zinc-100">72</span>
                                <span className="text-xl text-zinc-400">/100</span>
                                <Badge variant="success">+5 this week</Badge>
                            </div>
                            <p className="text-sm text-zinc-400 mt-2">
                                Your brand visibility across AI platforms is improving
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <div className="w-32 h-32 rounded-full border-8 border-violet-500/20 flex items-center justify-center relative">
                                <div
                                    className="absolute inset-0 rounded-full"
                                    style={{
                                        background: `conic-gradient(from 0deg, #8b5cf6 0%, #8b5cf6 72%, transparent 72%, transparent 100%)`,
                                    }}
                                />
                                <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center z-10">
                                    <Zap className="w-10 h-10 text-violet-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="LLM Visibility"
                        value="68%"
                        change="↑ 12% from last scan"
                        changeType="positive"
                        icon={Eye}
                        iconColor="text-violet-400"
                    />
                    <MetricCard
                        title="Forum Threads"
                        value="24"
                        change="8 high-priority opportunities"
                        changeType="neutral"
                        icon={MessageSquare}
                        iconColor="text-blue-400"
                    />
                    <MetricCard
                        title="Share of Voice"
                        value="23%"
                        change="↑ 3% vs competitors"
                        changeType="positive"
                        icon={TrendingUp}
                        iconColor="text-green-400"
                    />
                    <MetricCard
                        title="Content Score"
                        value="85"
                        change="2 pages need optimization"
                        changeType="neutral"
                        icon={FileText}
                        iconColor="text-orange-400"
                    />
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent LLM Mentions */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Recent LLM Mentions</CardTitle>
                            <Button variant="ghost" size="sm">
                                View all <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { platform: "ChatGPT", prompt: "best tyre inflator in India", sentiment: "positive", time: "2h ago" },
                                { platform: "Perplexity", prompt: "portable car air pump recommendation", sentiment: "neutral", time: "5h ago" },
                                { platform: "Gemini", prompt: "dylect vs portronics inflator", sentiment: "positive", time: "1d ago" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                                            <Search className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">{item.prompt}</p>
                                            <p className="text-xs text-zinc-500">{item.platform} • {item.time}</p>
                                        </div>
                                    </div>
                                    <Badge variant={item.sentiment === "positive" ? "success" : "outline"}>
                                        {item.sentiment}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Hot Forum Opportunities */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Hot Forum Opportunities</CardTitle>
                            <Button variant="ghost" size="sm">
                                View all <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                { title: "Best tyre inflator under 3000?", subreddit: "CarsIndia", score: 92, intent: "🛒 Buying" },
                                { title: "Portable air compressor recommendation", subreddit: "IndianGaming", score: 85, intent: "💡 Research" },
                                { title: "Dylect vs Qubo which is better?", subreddit: "india", score: 78, intent: "🆚 Compare" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                                            {item.score}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                                            <p className="text-xs text-zinc-500">r/{item.subreddit} • {item.intent}</p>
                                        </div>
                                    </div>
                                    <Badge variant="warning">🔥 HOT</Badge>
                                </div>
                            ))}
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
                            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                                <Search className="w-5 h-5" />
                                <span>Run LLM Scan</span>
                            </Button>
                            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                                <MessageSquare className="w-5 h-5" />
                                <span>Find Threads</span>
                            </Button>
                            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                                <BarChart3 className="w-5 h-5" />
                                <span>View Analytics</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
