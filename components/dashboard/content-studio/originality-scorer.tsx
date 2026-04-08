"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, AlertTriangle, Lightbulb, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface OriginalityResult {
    score: number;
    metrics: {
        informationGain: number;
        structuralUniqueness: number;
        perspectiveUniqueness: number;
    };
    analysis: {
        uniqueAngles: string[];
        commonKnowledge: string[];
        missingPerspectives: string[];
    };
}

export function OriginalityScorer() {
    const [content, setContent] = useState("");
    const [targetKeyword, setTargetKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OriginalityResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleScore = async () => {
        if (!content.trim() || !targetKeyword.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/content/originality", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, targetKeyword }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to score content originality");
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-400";
        if (score >= 50) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Sparkles className="w-48 h-48" />
                </div>
                <CardHeader className="relative z-10 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <Lightbulb className="w-3 h-3 mr-1" /> Originality
                        </Badge>
                    </div>
                    <CardTitle className="text-xl">Content Information Gain Scorer</CardTitle>
                    <CardDescription className="max-w-2xl text-[var(--text-secondary)]">
                        Evaluate your drafted content against the existing search landscape.
                        Ensure you are adding <b>net-new information</b> to the internet rather than just regurgitating competitors, a key requirement for AEO success.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-[var(--text-secondary)]" /> Target Keyword or Query
                            </label>
                            <input
                                className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-ghost)] focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                placeholder="e.g., 'best enterprise seo strategies'"
                                value={targetKeyword}
                                onChange={(e) => setTargetKeyword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[var(--text-secondary)]" /> Draft Content
                            </label>
                            <textarea
                                className="w-full h-48 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-ghost)] focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all resize-none"
                                placeholder="Paste your article draft here..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleScore}
                        disabled={loading || !content.trim() || !targetKeyword.trim()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Scoring Content...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Analyze Information Gain
                            </>
                        )}
                    </Button>

                    {error && (
                        <div className="p-3 text-sm rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {loading && (
                <div className="grid gap-6 md:grid-cols-2 animate-pulse">
                    <Card className="md:col-span-2 border-[var(--border-default)]"><CardContent className="h-32" /></Card>
                    <Card className="border-[var(--border-default)]"><CardContent className="h-64" /></Card>
                    <Card className="border-[var(--border-default)]"><CardContent className="h-64" /></Card>
                </div>
            )}

            {result && (
                <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-700">
                    <Card className="md:col-span-2 border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="flex flex-col md:flex-row items-center gap-8 p-6 lg:p-10">
                            <div className="text-center md:text-left flex-shrink-0">
                                <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-semibold">Information Gain Score</p>
                                <div className={cn("text-7xl font-black tabular-nums", getScoreColor(result.score))}>
                                    {result.score}
                                </div>
                                <p className="text-sm mt-2 text-[var(--text-secondary)]">
                                    {result.score >= 80 ? "Highly Original" : result.score >= 50 ? "Moderately Original" : "Highly Derivative"}
                                </p>
                            </div>

                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">New Value Props</span>
                                        <span className={cn("font-medium", getScoreColor(result.metrics.informationGain))}>{result.metrics.informationGain}/100</span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${result.metrics.informationGain}%` }} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">Structural Uniqueness</span>
                                        <span className={cn("font-medium", getScoreColor(result.metrics.structuralUniqueness))}>{result.metrics.structuralUniqueness}/100</span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${result.metrics.structuralUniqueness}%` }} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[var(--text-secondary)]">Unique Perspective</span>
                                        <span className={cn("font-medium", getScoreColor(result.metrics.perspectiveUniqueness))}>{result.metrics.perspectiveUniqueness}/100</span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--bg-base)] rounded-full overflow-hidden">
                                        <div className="h-full bg-violet-500 transition-all duration-1000" style={{ width: `${result.metrics.perspectiveUniqueness}%` }} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-[var(--border-default)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-5 h-5" />
                                Strengths: Unique Angles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {result.analysis.uniqueAngles.length > 0 ? (
                                    result.analysis.uniqueAngles.map((angle, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                                            {angle}
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-sm text-[var(--text-ghost)] italic">None detected. Your content reads very similarly to existing search results.</p>
                                )}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-[var(--border-default)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-400">
                                <AlertTriangle className="w-5 h-5" />
                                Weaknesses: Actionable Gaps
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Overused Common Knowledge</h4>
                                <ul className="space-y-2">
                                    {result.analysis.commonKnowledge.map((item, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] bg-amber-500/5 p-2 rounded border border-amber-500/10">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {result.analysis.missingPerspectives && result.analysis.missingPerspectives.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Missing Perspectives</h4>
                                    <ul className="space-y-2">
                                        {result.analysis.missingPerspectives.map((item, i) => (
                                            <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
