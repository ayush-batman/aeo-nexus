"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HelpCenterAudit } from "@/components/dashboard/audit/help-center-audit";
import { Search, Loader2, CheckCircle, AlertTriangle, AlertCircle, Sparkles, BookOpen, FileText } from "lucide-react";

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
                <p className="text-[var(--text-secondary)]">
                    Analyze your content to see if it's optimized for AI agents and RAG systems.
                </p>
            </div>

            {/* TABS FOR AUDIT TYPES */}
            <Tabs defaultValue="single-page" className="w-full">
                <TabsList className="mb-6 bg-[var(--bg-raised)] border border-[var(--border-default)]">
                    <TabsTrigger value="single-page" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                        <FileText className="w-4 h-4 mr-2" />
                        Single Page Audit
                    </TabsTrigger>
                    <TabsTrigger value="help-center" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Help Center Audit
                    </TabsTrigger>
                </TabsList>

                {/* --- SINGLE PAGE AUDIT TAB --- */}
                <TabsContent value="single-page" className="space-y-8 mt-0">
                    {/* Input Section */}
                    <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Enter URL to analyze (e.g., https://example.com/blog/post)"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                                    className="bg-[var(--bg-base)] border-[var(--border-default)]"
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
                            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] md:col-span-2">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <Skeleton className="h-5 w-32 bg-[var(--bg-raised)]" />
                                            <Skeleton className="h-4 w-64 bg-[var(--bg-raised)]" />
                                        </div>
                                        <Skeleton className="h-10 w-24 bg-[var(--bg-raised)]" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full mb-4 bg-[var(--bg-raised)]" />
                                    <Skeleton className="h-16 w-full bg-[var(--bg-raised)]" />
                                </CardContent>
                            </Card>
                            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                <CardHeader><Skeleton className="h-6 w-40 bg-[var(--bg-raised)]" /></CardHeader>
                                <CardContent className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex justify-between"><Skeleton className="h-4 w-24 bg-[var(--bg-raised)]" /><Skeleton className="h-4 w-16 bg-[var(--bg-raised)]" /></div>
                                    ))}
                                </CardContent>
                            </Card>
                            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                <CardHeader><Skeleton className="h-6 w-40 bg-[var(--bg-raised)]" /></CardHeader>
                                <CardContent className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="h-8 w-full bg-[var(--bg-raised)]" />
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
                            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] md:col-span-2">
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
                            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                <CardHeader>
                                    <CardTitle>Structure & Schema</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--text-secondary)]">H1 Tag</span>
                                        {result.structure.h1Count === 1 ? (
                                            <Badge variant="outline" className="text-green-400 border-green-400/30">Perfect</Badge>
                                        ) : (
                                            <Badge variant="destructive">Found {result.structure.h1Count}</Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--text-secondary)]">Information Depth</span>
                                        <span className="text-[var(--text-primary)]">{result.content.wordCount} words</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[var(--text-secondary)]">Schema.org</span>
                                        {result.structure.hasSchema ? (
                                            <div className="flex gap-1">
                                                {result.structure.schemaTypes.map((t, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs bg-[var(--bg-raised)] text-[var(--text-secondary)] border-[var(--border-default)]">{t}</Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <Badge variant="destructive">Missing</Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-[var(--bg-surface)] border-[var(--border-default)]">
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

                                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Q&A Pairs Detected</span>
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
                </TabsContent>

                {/* --- HELP CENTER AUDIT TAB --- */}
                <TabsContent value="help-center" className="mt-0">
                    <HelpCenterAudit />
                </TabsContent>
            </Tabs>
        </div>
    );
}
