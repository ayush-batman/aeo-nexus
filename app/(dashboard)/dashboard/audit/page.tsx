"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2, CheckCircle, AlertTriangle, AlertCircle, Sparkles } from "lucide-react";

interface AuditResult {
    url: string;
    score: number;
    readability: {
        score: number;
        issues: string[];
    };
    structure: {
        h1Count: number;
        h2Count: number;
        h3Count: number;
        hasSchema: boolean;
        schemaTypes: string[];
        metaDescription: boolean;
    };
    content: {
        wordCount: number;
        qnaCount: number;
    };
    summary: string;
}

export default function AuditPage() {
    const [url, setUrl] = useState("");
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleAudit() {
        if (!url) return;

        setScanning(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Audit failed');
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setScanning(false);
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Sparkles className="w-8 h-8 text-violet-500" />
                    Agent-Ready Content Auditor
                </h1>
                <p className="text-[var(--text-muted)]">
                    Analyze your content to see if it's optimized for AI agents and RAG systems.
                </p>
            </div>

            {/* Input Section */}
            <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <Input
                            placeholder="Enter URL to analyze (e.g., https://example.com/blog/post)"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                            className="bg-[var(--background)] border-[var(--border)]"
                        />
                        <Button onClick={handleAudit} disabled={scanning || !url}>
                            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Audit
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Loading State */}
            {scanning && (
                <div className="grid gap-6 md:grid-cols-2 animate-pulse">
                    <Card className="bg-[var(--surface)] border-[var(--border)] md:col-span-2">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32 bg-[var(--surface-elevated)]" />
                                    <Skeleton className="h-4 w-64 bg-[var(--surface-elevated)]" />
                                </div>
                                <Skeleton className="h-10 w-24 bg-[var(--surface-elevated)]" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-4 bg-[var(--surface-elevated)]" />
                            <Skeleton className="h-16 w-full bg-[var(--surface-elevated)]" />
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardHeader><Skeleton className="h-6 w-40 bg-[var(--surface-elevated)]" /></CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex justify-between"><Skeleton className="h-4 w-24 bg-[var(--surface-elevated)]" /><Skeleton className="h-4 w-16 bg-[var(--surface-elevated)]" /></div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardHeader><Skeleton className="h-6 w-40 bg-[var(--surface-elevated)]" /></CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-8 w-full bg-[var(--surface-elevated)]" />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    {error}
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="grid gap-6 md:grid-cols-2 animate-in slide-in-from-bottom-5 fade-in duration-700">
                    {/* Score Card */}
                    <Card className="bg-[var(--surface)] border-[var(--border)] md:col-span-2">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Optimization Score</CardTitle>
                                    <CardDescription>How readable this page is for AI agents</CardDescription>
                                </div>
                                <span className="text-4xl font-bold text-indigo-400">{result.score}/100</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Progress value={result.score} className="h-4" />
                            <p className="mt-4 text-[var(--text-secondary)] font-medium">
                                {result.summary}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Breakdown */}
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardHeader>
                            <CardTitle>Structure & Schema</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-muted)]">H1 Tag</span>
                                {result.structure.h1Count === 1 ? (
                                    <Badge variant="outline" className="text-green-400 border-green-400/30">Perfect</Badge>
                                ) : (
                                    <Badge variant="destructive">Found {result.structure.h1Count}</Badge>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-muted)]">Information Depth</span>
                                <span className="text-[var(--text-primary)]">{result.content.wordCount} words</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-muted)]">Schema.org</span>
                                {result.structure.hasSchema ? (
                                    <div className="flex gap-1">
                                        {result.structure.schemaTypes.map((t, i) => (
                                            <Badge key={i} variant="outline" className="text-xs bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border)]">{t}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <Badge variant="destructive">Missing</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardHeader>
                            <CardTitle>Agent Insights</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {result.readability.issues.length === 0 ? (
                                <div className="flex items-center text-green-400 gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>No critical issues found!</span>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {result.readability.issues.map((issue, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-amber-200/80">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            {issue}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                <div className="flex items-center justify-between">
                                    <span className="text-[var(--text-muted)]">Q&A Pairs Detected</span>
                                    <span className="font-mono text-[var(--text-primary)]">{result.content.qnaCount}</span>
                                </div>
                                <p className="text-xs text-[var(--text-ghost)] mt-1">
                                    Common questions detected. High Q&A count helps with Featured Snippets.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
