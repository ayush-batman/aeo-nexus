"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Loader2,
    CheckCircle,
    XCircle,
    Lock,
    ArrowRight,
    Sparkles,
} from "lucide-react";

interface ScanResult {
    platform: string;
    mentioned: boolean;
    sentiment: string;
    visibilityScore: number;
    snippet: string;
    limitedView: boolean;
    message: string;
}

export function TryFreeSection() {
    const [brandName, setBrandName] = useState("");
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleScan() {
        if (!brandName.trim() || brandName.length < 2) return;

        setScanning(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/free-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Scan failed');
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setScanning(false);
        }
    }

    return (
        <section className="py-20 px-6 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
            <div className="max-w-3xl mx-auto text-center">
                <Badge variant="outline" className="mb-4">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Free Instant Scan
                </Badge>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
                    See how AI sees your brand
                </h2>
                <p className="text-[var(--text-muted)] mb-8 max-w-xl mx-auto">
                    Enter your brand name and get an instant visibility check — no signup required.
                </p>

                {/* Input Section */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
                        <Input
                            className="pl-10 h-12"
                            placeholder="Enter your brand name"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                            disabled={scanning}
                        />
                    </div>
                    <Button
                        size="lg"
                        onClick={handleScan}
                        disabled={scanning || brandName.length < 2}
                        className="w-full sm:w-auto"
                    >
                        {scanning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Scanning AI...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4 mr-2" />
                                Scan Free
                            </>
                        )}
                    </Button>
                </div>

                {/* Error State */}
                {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 mb-6">
                        {error}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="mt-8 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[var(--text-primary)]">
                                Results for &quot;{brandName}&quot;
                            </h3>
                            <Badge variant="outline" className="capitalize">
                                {result.platform}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] text-center">
                                <div className="flex items-center justify-center mb-2">
                                    {result.mentioned ? (
                                        <CheckCircle className="w-6 h-6 text-green-400" />
                                    ) : (
                                        <XCircle className="w-6 h-6 text-red-400" />
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-muted)]">Mentioned</p>
                                <p className="font-semibold text-[var(--text-primary)]">
                                    {result.mentioned ? "Yes" : "No"}
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] text-center">
                                <p className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                                    {result.visibilityScore}%
                                </p>
                                <p className="text-sm text-[var(--text-muted)]">Visibility</p>
                            </div>
                            <div className="p-4 rounded-lg bg-[var(--surface-elevated)] text-center">
                                <Badge
                                    variant={
                                        result.sentiment === "positive"
                                            ? "success"
                                            : result.sentiment === "negative"
                                                ? "destructive"
                                                : "outline"
                                    }
                                    className="mb-2"
                                >
                                    {result.sentiment}
                                </Badge>
                                <p className="text-sm text-[var(--text-muted)]">Sentiment</p>
                            </div>
                        </div>

                        {/* Snippet with blur */}
                        <div className="relative p-4 rounded-lg bg-[var(--surface-elevated)]/30 mb-6">
                            <p className="text-sm text-[var(--text-muted)] line-clamp-3">
                                {result.snippet}
                            </p>
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs text-[var(--text-ghost)]">
                                <Lock className="w-3 h-3" />
                                Sign up to see full response
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-center">
                            <p className="text-sm text-indigo-300 mb-3">
                                {result.message}
                            </p>
                            <Link href="/signup">
                                <Button>
                                    Get Full Access
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                <p className="text-xs text-[var(--text-ghost)] mt-6">
                    3 free scans per hour • No signup required
                </p>
            </div>
        </section>
    );
}
