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
    const [error, setError] = useState<string | null>(null);

    const runAudit = async () => {
        if (!url) return;
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const res = await fetch('/api/audit/technical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not check the page and robots file. Please retry.');
            setResult(data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Audit failed. Please retry.');
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
                        Inspect this URL’s robots rules for the listed bot names. Training and answer-search bots have different purposes; these rules do not prove visits, access, or future mentions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Input
                            aria-label="Page URL to audit"
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
                    {error && <p role="alert" className="mt-3 text-[var(--data-red)]">{error}</p>}
                </CardContent>
            </Card>

            {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Overall Status */}
                    <Card className={result.aiBotsBlocked ? "border-[var(--data-red)]/40 bg-[var(--data-red)]/5" : "border-[var(--data-green)]/40 bg-[var(--data-green)]/5"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {result.aiBotsBlocked ? <ShieldAlert className="w-6 h-6 text-[var(--data-red)]" /> : <ShieldCheck className="w-6 h-6 text-[var(--data-green)]" />}
                                {result.aiBotsBlocked ? "Some listed bots are disallowed" : "No disallow found for listed bots"}
                            </CardTitle>
                            <CardDescription className={result.aiBotsBlocked ? "text-[var(--data-red)]/80" : "text-[var(--data-green)]/80"}>
                                {result.aiBotsBlocked
                                    ? "Review each rule against your intended crawling and training policy. A disallow does not establish its effect on visibility."
                                    : "No matching restriction was found in the fetched robots rules. Other access controls and bot-specific policies may still apply."}
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
                                            <span className="flex items-center text-[var(--data-green)] text-xs font-medium"><CheckCircle className="w-3 h-3 mr-1" /> Allowed</span>
                                        ) : (
                                            <span className="flex items-center text-[var(--data-red)] text-xs font-medium"><XCircle className="w-3 h-3 mr-1" /> Blocked</span>
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
