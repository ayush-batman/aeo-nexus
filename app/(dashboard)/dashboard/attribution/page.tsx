"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Loader2,
    Copy,
    Check,
    BarChart3,
    Sparkles,
    Code,
    Bot,
    PieChart,
} from "lucide-react";

interface AttributionData {
    total: number;
    aiInfluenced: number;
    aiInfluencedPercentage: number;
    sources: { source: string; count: number; percentage: number }[];
    recentResponses: { source: string; timestamp: string }[];
}

const SOURCE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    chatgpt: { label: "ChatGPT", emoji: "🟢", color: "bg-green-500" },
    gemini: { label: "Google Gemini", emoji: "🔵", color: "bg-blue-500" },
    perplexity: { label: "Perplexity", emoji: "🟣", color: "bg-purple-500" },
    claude: { label: "Claude", emoji: "🟠", color: "bg-orange-500" },
    ai_assistant: { label: "AI Assistant (Other)", emoji: "🤖", color: "bg-cyan-500" },
    ai_search: { label: "AI Search", emoji: "🔍", color: "bg-indigo-500" },
    google_search: { label: "Google Search", emoji: "🌐", color: "bg-yellow-500" },
    social_media: { label: "Social Media", emoji: "📱", color: "bg-pink-500" },
    referral: { label: "Referral", emoji: "👥", color: "bg-teal-500" },
    direct: { label: "Direct", emoji: "🔗", color: "bg-gray-500" },
    other: { label: "Other", emoji: "❓", color: "bg-gray-400" },
};

const PIE_COLORS = ["#6366F1", "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6"];

export default function AttributionPage() {
    const [data, setData] = useState<AttributionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<"dashboard" | "widget">("dashboard");

    useEffect(() => {
        fetchAttribution();
    }, []);

    const fetchAttribution = async () => {
        try {
            const res = await fetch("/api/attribution/survey");
            if (res.ok) {
                const d = await res.json();
                setData(d);
            }
        } catch (err) {
            console.error("Error fetching attribution:", err);
        } finally {
            setLoading(false);
        }
    };

    const widgetCode = `<!-- Aelo Attribution Survey Widget -->
<script>
(function() {
  var w = document.createElement('div');
  w.id = 'aelo-attribution';
  w.innerHTML = '<div style="position:fixed;bottom:24px;right:24px;z-index:9999;font-family:system-ui;max-width:320px;">' +
    '<div style="background:#1a1a2e;border:1px solid #333;border-radius:16px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">' +
    '<p style="color:#fff;font-size:14px;font-weight:600;margin:0 0 12px;">How did you find us?</p>' +
    '<div id="aelo-options" style="display:flex;flex-direction:column;gap:8px;"></div>' +
    '</div></div>';
  document.body.appendChild(w);
  var options = [
    {v:'chatgpt',l:'🟢 ChatGPT'},{v:'gemini',l:'🔵 Google Gemini'},
    {v:'perplexity',l:'🟣 Perplexity'},{v:'ai_assistant',l:'🤖 Other AI'},
    {v:'google_search',l:'🌐 Google Search'},{v:'social_media',l:'📱 Social Media'},
    {v:'referral',l:'👥 Friend/Colleague'},{v:'other',l:'❓ Other'}
  ];
  var container = document.getElementById('aelo-options');
  options.forEach(function(o) {
    var btn = document.createElement('button');
    btn.textContent = o.l;
    btn.style.cssText = 'background:#252540;color:#ccc;border:1px solid #444;border-radius:10px;padding:8px 12px;font-size:12px;cursor:pointer;text-align:left;transition:all 0.2s;';
    btn.onmouseover = function(){this.style.borderColor='#6366F1';this.style.color='#fff';};
    btn.onmouseout = function(){this.style.borderColor='#444';this.style.color='#ccc';};
    btn.onclick = function() {
      fetch('/api/attribution/survey', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({workspaceId:'YOUR_WORKSPACE_ID',source:o.v})
      });
      w.innerHTML = '<div style="position:fixed;bottom:24px;right:24px;z-index:9999;font-family:system-ui;">' +
        '<div style="background:#1a1a2e;border:1px solid #333;border-radius:16px;padding:20px;box-shadow:0 8px 32px rgba(0,0,0,0.5);text-align:center;">' +
        '<p style="color:#6366F1;font-size:24px;margin:0 0 8px;">✓</p>' +
        '<p style="color:#fff;font-size:14px;margin:0;">Thanks!</p></div></div>';
      setTimeout(function(){w.remove()},2000);
    };
    container.appendChild(btn);
  });
})();
</script>`;

    const handleCopyWidget = () => {
        navigator.clipboard.writeText(widgetCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <Header title="Attribution" description="Track how users discover you through AI" />

            <div className="p-6 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "dashboard"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                            }`}
                    >
                        <BarChart3 className="w-4 h-4 inline mr-2" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab("widget")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "widget"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                            }`}
                    >
                        <Code className="w-4 h-4 inline mr-2" />
                        Install Widget
                    </button>
                </div>

                {activeTab === "dashboard" && (
                    <>
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-[var(--bg-surface)] animate-pulse" />)}
                            </div>
                        ) : (
                            <>
                                {/* Key Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
                                        <p className="text-xs text-[var(--text-ghost)] uppercase tracking-wider mb-1">Total Responses</p>
                                        <p className="text-3xl font-bold font-display text-[var(--text-primary)]">{data?.total || 0}</p>
                                    </div>
                                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                                        <p className="text-xs text-indigo-400 uppercase tracking-wider mb-1">AI-Influenced</p>
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-3xl font-bold font-display text-indigo-400">{data?.aiInfluenced || 0}</p>
                                            <span className="text-sm text-indigo-300">{data?.aiInfluencedPercentage || 0}%</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
                                        <p className="text-xs text-[var(--text-ghost)] uppercase tracking-wider mb-1">Top Source</p>
                                        <p className="text-lg font-bold font-display text-[var(--text-primary)]">
                                            {data?.sources?.[0]
                                                ? `${SOURCE_LABELS[data.sources[0].source]?.emoji || "❓"} ${SOURCE_LABELS[data.sources[0].source]?.label || data.sources[0].source}`
                                                : "No data yet"
                                            }
                                        </p>
                                    </div>
                                </div>

                                {/* Source Breakdown */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <PieChart className="w-4 h-4 text-indigo-400" />
                                            Attribution Sources
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {data?.sources && data.sources.length > 0 ? (
                                            <div className="space-y-3">
                                                {data.sources.map((s, i) => {
                                                    const meta = SOURCE_LABELS[s.source] || { label: s.source, emoji: "❓", color: "bg-gray-500" };
                                                    return (
                                                        <div key={s.source} className="flex items-center gap-3">
                                                            <span className="text-sm w-5 text-center">{meta.emoji}</span>
                                                            <span className="text-sm text-[var(--text-primary)] w-40">{meta.label}</span>
                                                            <div className="flex-1 h-2 bg-[var(--bg-raised)] rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${s.percentage}%`,
                                                                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-[var(--text-ghost)] w-16 text-right">
                                                                {s.count} ({s.percentage}%)
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-[var(--text-ghost)]">
                                                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm mb-2">No attribution data yet</p>
                                                <p className="text-xs max-w-sm mx-auto">Install the survey widget on your site to start tracking how users discover you.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </>
                )}

                {activeTab === "widget" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Code className="w-4 h-4 text-indigo-400" />
                                Install Attribution Widget
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Add this script to your website (before the closing <code>&lt;/body&gt;</code> tag) to show a&nbsp;
                                &quot;How did you find us?&quot; survey on your site. Responses are tracked in the Attribution dashboard.
                            </p>

                            <div className="relative">
                                <pre className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] overflow-x-auto max-h-[300px]">
                                    <code>{widgetCode}</code>
                                </pre>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyWidget}
                                    className="absolute top-3 right-3"
                                >
                                    {copied ? <Check className="w-3.5 h-3.5 mr-1 text-green-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                                    {copied ? "Copied!" : "Copy"}
                                </Button>
                            </div>

                            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                                <p className="text-xs text-yellow-400 font-medium mb-1">⚠️ Don&apos;t forget</p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    Replace <code>YOUR_WORKSPACE_ID</code> in the script with your actual workspace ID from Settings.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
