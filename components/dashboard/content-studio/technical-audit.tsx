"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldAlert, CheckCircle, XCircle, Globe, Search, FileText } from "lucide-react";

interface AuditResult {
    robotsStatus: string;
    aiBotsBlocked: boolean;
    details: Array<{ bot: string; allowed: boolean }>;
    metaTags: Array<{ name: string; content: string }>;
    sitemaps: string[];
    checkedUrl: string;
}

export function TechnicalAudit() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AuditResult | null>(null);

    const runAudit = async () => {
        if (!url) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/audit/technical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Technical Aelo Audit</CardTitle>
                    <CardDescription>
                        Check if your site is blocking AI crawlers (ChatGPT, Gemini, Claude, etc.) from reading your content.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Input
                            placeholder="https://example.com"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runAudit()}
                        />
                        <Button onClick={runAudit} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                            Run Audit
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Overall Status */}
                    <Card className={result.aiBotsBlocked ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {result.aiBotsBlocked ? <ShieldAlert className="w-6 h-6 text-red-500" /> : <ShieldCheck className="w-6 h-6 text-green-500" />}
                                {result.aiBotsBlocked ? "AI Crawlers Blocked!" : "AI Crawlers Allowed"}
                            </CardTitle>
                            <CardDescription className={result.aiBotsBlocked ? "text-red-400/80" : "text-green-400/80"}>
                                {result.aiBotsBlocked
                                    ? "Your site configuration is preventing AI engines from reading your content. This hurts your Aelo visibility."
                                    : "Great! Your site is technically accessible to major AI engines."}
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Robots.txt Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Robots.txt Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]">
                                <span className="text-sm text-[var(--text-secondary)]">File Status</span>
                                <Badge variant={result.robotsStatus === 'found' ? 'success' : 'destructive'}>
                                    {result.robotsStatus === 'found' ? 'FOUND' : 'MISSING/ERROR'}
                                </Badge>
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                {result.details.map((bot) => (
                                    <div key={bot.bot} className="flex items-center justify-between text-sm py-1">
                                        <span className="text-[var(--text-secondary)]">{bot.bot}</span>
                                        {bot.allowed ? (
                                            <span className="flex items-center text-green-400 text-xs font-medium"><CheckCircle className="w-3 h-3 mr-1" /> Allowed</span>
                                        ) : (
                                            <span className="flex items-center text-red-400 text-xs font-medium"><XCircle className="w-3 h-3 mr-1" /> Blocked</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sitemaps */}
                    {result.sitemaps.length > 0 && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Detected Sitemaps
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc list-inside text-sm text-[var(--text-secondary)]">
                                    {result.sitemaps.map((map, i) => (
                                        <li key={i}>{map}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
