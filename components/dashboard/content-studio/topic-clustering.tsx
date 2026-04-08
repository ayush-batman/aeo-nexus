"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Layers, ListTree, ArrowRight, Target } from "lucide-react";

interface TopicCluster {
    pillar: string;
    description: string;
    clusters: {
        keyword: string;
        intent: string;
        format: string;
    }[];
}

export function TopicClustering() {
    const [topic, setTopic] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TopicCluster | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/content/topic-cluster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coreTopic: topic }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate topic cluster");
            }

            setResult(data.cluster);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent pb-6 border-b border-[var(--border-default)]">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <ListTree className="w-3 h-3 mr-1" /> Strategy
                        </Badge>
                    </div>
                    <CardTitle className="text-xl">Topic Cluster Generator</CardTitle>
                    <CardDescription className="max-w-2xl text-[var(--text-secondary)]">
                        Generate a semantic content hub strategy. AI Agents love content organized in Pillar-Cluster models as it signals complete topical authority.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <Input
                            placeholder="Enter core topic (e.g., 'Cloud Security Posture Management')"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                            className="bg-[var(--bg-base)] border-[var(--border-default)]"
                        />
                        <Button onClick={handleGenerate} disabled={loading || !topic.trim()} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Build Cluster
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    <Card className="md:col-span-full border-[var(--border-default)]"><CardContent className="h-32" /></Card>
                    <Card className="border-[var(--border-default)]"><CardContent className="h-48" /></Card>
                    <Card className="border-[var(--border-default)]"><CardContent className="h-48" /></Card>
                    <Card className="border-[var(--border-default)]"><CardContent className="h-48" /></Card>
                </div>
            )}

            {result && (
                <div className="space-y-6 animate-in fade-in duration-700">
                    {/* Pillar Content */}
                    <Card className="border-blue-500/30 bg-blue-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <ListTree className="w-32 h-32" />
                        </div>
                        <CardHeader className="relative z-10 pb-4 border-b border-blue-500/10">
                            <Badge className="w-fit mb-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">Pillar Page</Badge>
                            <CardTitle className="text-2xl text-[var(--text-primary)]">{result.pillar}</CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-4">
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                                {result.description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Cluster Nodes */}
                    <div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-indigo-400" />
                            Supporting Cluster Pages ({result.clusters.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {result.clusters.map((cluster, i) => (
                                <Card key={i} className="bg-[var(--bg-surface)] border-[var(--border-default)] group hover:border-indigo-500/50 transition-colors">
                                    <CardContent className="p-5 h-full flex flex-col">
                                        <h4 className="font-semibold text-[var(--text-primary)] mb-3 group-hover:text-indigo-400 transition-colors">
                                            {cluster.keyword}
                                        </h4>
                                        <div className="mt-auto space-y-2 pt-4 border-t border-[var(--border-default)]">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-[var(--text-ghost)] flex items-center gap-1">
                                                    <Target className="w-3 h-3" /> Intent
                                                </span>
                                                <span className="text-[var(--text-secondary)] font-medium capitalize">{cluster.intent}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-[var(--text-ghost)] flex items-center gap-1">
                                                    <ArrowRight className="w-3 h-3" /> Format
                                                </span>
                                                <span className="text-[var(--text-secondary)] font-medium capitalize">{cluster.format}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
