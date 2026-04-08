"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, CheckCircle, AlertTriangle, AlertCircle, Sparkles, BookOpen } from "lucide-react";

interface HelpCenterAuditResult {
    url: string;
    overallScore: number;
    metrics: {
        coverage: number;
        structure: number;
        clarity: number;
        technical: number;
    };
    findings: {
        issues: string[];
        strengths: string[];
        missingTopics: string[];
    };
    recommendations: string[];
}

export function HelpCenterAudit() {
    const [url, setUrl] = useState("");
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<HelpCenterAuditResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAudit = async () => {
        if (!url) return;

        setScanning(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch('/api/audit/help-center', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Help Center audit failed');
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] overflow-hidden">
                <div className="bg-gradient-to-r from-violet-500/10 to-transparent p-6 pb-0 border-b border-[var(--border-default)] relative">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <BookOpen className="w-24 h-24" />
                    </div>
                    <CardHeader className="p-0 pb-6 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                                <Sparkles className="w-3 h-3 mr-1" /> Premium Audit
                            </Badge>
                        </div>
                        <CardTitle className="text-2xl text-[var(--text-primary)]">Help Center AI-Readiness</CardTitle>
                        <CardDescription className="text-[var(--text-secondary)] xl:w-2/3">
                            Analyze your complete help center structure. Discover if your documentation is easily digested by LLMs and RAG systems to be used as authoritative answers.
                        </CardDescription>
                    </CardHeader>
                </div>

                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <Input
                            placeholder="Enter Help Center URL (e.g., https://help.example.com)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                            className="bg-[var(--bg-base)] border-[var(--border-default)]"
                        />
                        <Button onClick={handleAudit} disabled={scanning || !url} className="bg-violet-600 hover:bg-violet-700 text-white">
                            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Run Deep Scan
                        </Button>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {scanning && (
                <div className="grid gap-6 md:grid-cols-2 animate-pulse">
                    <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] md:col-span-2 p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                            <div>
                                <h3 className="text-lg font-medium text-[var(--text-primary)]">Crawling & Analyzing Help Center...</h3>
                                <p className="text-sm text-[var(--text-secondary)]">This usually takes about 15-30 seconds depending on size.</p>
                            </div>
                        </div>
                        <Progress value={45} className="h-2" />
                    </Card>
                </div>
            )}

            {result && (
                <div className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-700">
                    <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] md:col-span-3">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="text-center md:text-left">
                                    <p className="text-sm text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-semibold">Total AEO Score</p>
                                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-indigo-600">
                                        {result.overallScore}
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                    <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)]">
                                        <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Topic Coverage</p>
                                        <div className="text-2xl font-bold text-[var(--text-primary)]">{result.metrics.coverage}/100</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)]">
                                        <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Structure</p>
                                        <div className="text-2xl font-bold text-[var(--text-primary)]">{result.metrics.structure}/100</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)]">
                                        <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Readability</p>
                                        <div className="text-2xl font-bold text-[var(--text-primary)]">{result.metrics.clarity}/100</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-default)]">
                                        <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Technical SEO</p>
                                        <div className="text-2xl font-bold text-[var(--text-primary)]">{result.metrics.technical}/100</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] md:col-span-2">
                        <CardHeader>
                            <CardTitle>Top Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {result.recommendations.map((rec, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-[var(--text-secondary)] bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-default)]">
                                        <Sparkles className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Critical Issues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {result.findings.issues.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.findings.issues.map((issue, i) => (
                                            <li key={i} className="text-xs text-[var(--text-secondary)] flex gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                                                <span>{issue}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-green-400">No critical issues detected.</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Search className="w-4 h-4 text-indigo-400" />
                                    Missing Topics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {result.findings.missingTopics.map((topic, i) => (
                                        <Badge key={i} variant="outline" className="text-xs bg-[var(--bg-base)]">{topic}</Badge>
                                    ))}
                                    {result.findings.missingTopics.length === 0 && (
                                        <p className="text-xs text-green-400">Content coverage looks comprehensive.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            )}
        </div>
    );
}
