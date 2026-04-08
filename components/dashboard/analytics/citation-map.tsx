"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, Link2, AlertCircle, TrendingUp, Lightbulb, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationSource {
    domain: string;
    urlCount: number;
    totalMentions: number;
    isOwnDomain: boolean;
}

interface CitationAnalysis {
    classification: {
        owned: CitationSource[];
        thirdParty: CitationSource[];
        competitor: CitationSource[];
    };
    gapAnalysis: {
        missingTypes: string[];
    };
    recommendations: string[];
    topUrls: { url: string; count: number }[];
}

export function CitationMap() {
    const [data, setData] = useState<CitationAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/analytics/citations");
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to load citation data");
            setData(json);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-12 flex flex-col items-center justify-center text-[var(--text-ghost)]">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
                    <p>Generating Citation Source Map...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-6 flex items-center justify-between text-red-400">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchData} className="border-red-500/30 hover:bg-red-500/10">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    const hasData = [
        ...data.classification.owned,
        ...data.classification.thirdParty,
        ...data.classification.competitor
    ].length > 0;

    if (!hasData) {
        return (
            <Card>
                <CardContent className="p-12 text-center text-[var(--text-ghost)]">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No Citations Discovered Yet</h3>
                    <p className="text-sm max-w-md mx-auto">
                        Run more LLM scans that return citations to populate the Source Map.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden bg-[var(--bg-base)]/50 border border-[var(--border-default)]/80 backdrop-blur-xl">
            <CardHeader className="border-b border-[var(--border-default)]/50 pb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <MapPin className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Citation Source Map</CardTitle>
                        <CardDescription>Analyze where AI models are pulling information about your queries</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Source Classification */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Globe className="w-5 h-5 text-violet-400" />
                            Source Landscape
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Owned */}
                            <div className="bg-[var(--bg-raised)] p-4 rounded-xl border border-[var(--border-default)]">
                                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center justify-between">
                                    Owned Assets
                                    <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">{data.classification.owned.length}</Badge>
                                </h4>
                                <div className="space-y-2">
                                    {data.classification.owned.length > 0 ? (
                                        data.classification.owned.map((src, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--text-primary)] truncate pr-2">{src.domain}</span>
                                                <span className="text-[var(--text-ghost)] font-mono">{src.totalMentions}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-[var(--text-ghost)] italic">No owned citations yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Third Party */}
                            <div className="bg-[var(--bg-raised)] p-4 rounded-xl border border-[var(--border-default)]">
                                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center justify-between">
                                    Third-Party Platforms
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{data.classification.thirdParty.length}</Badge>
                                </h4>
                                <div className="space-y-2">
                                    {data.classification.thirdParty.length > 0 ? (
                                        data.classification.thirdParty.slice(0, 5).map((src, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--text-primary)] truncate pr-2">{src.domain}</span>
                                                <span className="text-[var(--text-ghost)] font-mono">{src.totalMentions}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-[var(--text-ghost)] italic">No third-party citations.</p>
                                    )}
                                    {data.classification.thirdParty.length > 5 && (
                                        <p className="text-xs text-[var(--text-ghost)] text-center pt-2">+{data.classification.thirdParty.length - 5} more</p>
                                    )}
                                </div>
                            </div>

                            {/* Competitor Focus (If we had competitor domains explicitly listed, for now we map them to thirdParty/others or if custom logic detects) */}
                            {data.classification.competitor.length > 0 ? (
                                <div className="bg-[var(--bg-raised)] p-4 rounded-xl border border-[var(--border-default)]">
                                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center justify-between">
                                        Competitors
                                        <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20">{data.classification.competitor.length}</Badge>
                                    </h4>
                                    <div className="space-y-2">
                                        {data.classification.competitor.map((src, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-[var(--text-primary)] truncate pr-2">{src.domain}</span>
                                                <span className="text-[var(--text-ghost)] font-mono">{src.totalMentions}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-[var(--bg-raised)] p-4 rounded-xl border border-[var(--border-default)] flex flex-col items-center justify-center text-center opacity-70">
                                    <Search className="w-6 h-6 text-[var(--text-ghost)] mb-2" />
                                    <p className="text-xs text-[var(--text-secondary)]">No competitor citations detected directly.</p>
                                </div>
                            )}
                        </div>

                        {/* Top Specific URLs */}
                        {data.topUrls.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                    <Link2 className="w-4 h-4" /> Highly Cited Specific URLs
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {data.topUrls.slice(0, 4).map((item, i) => (
                                        <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-raised)] border border-[var(--border-default)] transition-colors group">
                                            <span className="text-xs text-[var(--text-secondary)] group-hover:text-indigo-400 truncate pr-4">{item.url}</span>
                                            <Badge variant="outline" className="text-xs">{item.count}</Badge>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Insights & Recommendations */}
                    <div className="bg-gradient-to-br from-indigo-500/5 to-violet-500/10 rounded-2xl p-6 border border-indigo-500/20">
                        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                            <Lightbulb className="w-5 h-5 text-yellow-400" />
                            Action Plan
                        </h3>

                        {data.gapAnalysis.missingTypes.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Missing Content Types</h4>
                                <div className="flex flex-wrap gap-2">
                                    {data.gapAnalysis.missingTypes.map((type, i) => (
                                        <Badge key={i} variant="outline" className="border-red-500/30 text-red-400 bg-red-500/5">
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">AI Recommendations</h4>
                            <ul className="space-y-3">
                                {data.recommendations.map((rec, i) => (
                                    <li key={i} className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                                        <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        {rec}
                                    </li>
                                ))}
                                {data.recommendations.length === 0 && (
                                    <li className="text-sm text-[var(--text-ghost)] italic">Gathering more data for recommendations...</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
