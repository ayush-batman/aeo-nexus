"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Swords,
    Loader2,
    Trophy,
    AlertCircle,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// The API returns a merged ScanResult + BattleResult object
interface BattleResultData {
    platform: string;
    prompt: string;
    response: string;
    brandMentioned: boolean;
    mentionPosition: number | null;
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    competitorsMentioned: string[];
    competitorPositions: { name: string; position: number | null; sentiment: string }[];
    winner: string | null;
    winnerReason: string;
}

export default function BattlePage() {
    const [brandName, setBrandName] = useState("");
    const [competitorName, setCompetitorName] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<BattleResultData | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleBattle() {
        if (!brandName || !competitorName || !productCategory) return;

        setScanning(true);
        setError(null);
        setResult(null);

        // Construct a comparative prompt
        const prompt = `Compare the following two brands for ${productCategory}: 1. ${brandName} 2. ${competitorName}. Which one is better and why?`;

        try {
            // Re-using the existing scan API but with specific params
            // In a real app, we'd have a dedicated /api/battle endpoint
            // For now, we simulate the battle logic on the client or reuse the generic scan
            const res = await fetch('/api/llm/scans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    brandName,
                    competitors: [competitorName],
                    mode: 'battle' // We added this to the scanner lib
                }),
            });

            // Note: Since we haven't updated the API route to accept 'mode' yet, 
            // the backend might ignore it. We'll handle the display logic here.


            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Battle failed');

            // Handle response which wraps results
            const results = data.results || (Array.isArray(data) ? data : []);
            const battleResult = results.length > 0 ? results[0] : null;

            if (!battleResult) throw new Error('No battle results found');

            setResult(battleResult);

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
                    <Swords className="w-8 h-8 text-orange-500" />
                    Competitor Battle Arena
                </h1>
                <p className="text-[var(--text-muted)]">
                    Go head-to-head with your competitors in AI responses.
                </p>
            </div>

            {/* Input Section */}
            <Card className="bg-[var(--surface)] border-[var(--border)]">
                <CardHeader>
                    <CardTitle>Setup the Fight</CardTitle>
                    <CardDescription>Enter the contenders and the battleground.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-muted)]">Your Brand</label>
                            <Input
                                placeholder="e.g., Nike"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                className="bg-[var(--background)] border-[var(--border)]"
                            />
                        </div>
                        <div className="flex items-center justify-center pt-6">
                            <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-lg shadow-orange-900/10 transform hover:scale-110 transition-transform">
                                <span className="text-orange-500 font-black text-lg italic">VS</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--text-muted)]">Competitor</label>
                            <Input
                                placeholder="e.g., Adidas"
                                value={competitorName}
                                onChange={(e) => setCompetitorName(e.target.value)}
                                className="bg-[var(--background)] border-[var(--border)]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--text-muted)]">Battleground (Product Category / Query)</label>
                        <Input
                            placeholder="e.g., Best running shoes for marathons"
                            value={productCategory}
                            onChange={(e) => setProductCategory(e.target.value)}
                            className="bg-[var(--background)] border-[var(--border)]"
                        />
                    </div>

                    <Button
                        onClick={handleBattle}
                        disabled={scanning || !brandName || !competitorName || !productCategory}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12"
                    >
                        {scanning ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing AI Response...
                            </>
                        ) : (
                            <>
                                <Swords className="w-4 h-4 mr-2" />
                                Start Battle
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Pro Tips */}
            {!result && !scanning && (
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { title: "Be Specific", desc: "Instead of \"Shoes\", try \"Best marathon running shoes under $150\"." },
                        { title: "Analyze Gaps", desc: "Use the \"Winner Reason\" to understand exactly why AI prefers one brand." },
                        { title: "Iterate", desc: "Try different queries to map out your entire competitive landscape." }
                    ].map((tip, i) => (
                        <div key={i} className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                            <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 text-xs border border-orange-500/20">{i + 1}</span>
                                {tip.title}
                            </h3>
                            <p className="text-sm text-[var(--text-muted)]">{tip.desc}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {scanning && (
                <div className="space-y-6 animate-pulse mt-8">
                    <Skeleton className="h-48 w-full rounded-xl bg-[var(--surface)]" />
                    <div className="grid md:grid-cols-2 gap-6">
                        <Skeleton className="h-32 w-full rounded-xl bg-[var(--surface)]" />
                        <Skeleton className="h-32 w-full rounded-xl bg-[var(--surface)]" />
                    </div>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Winner Banner */}
                    <div className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950/20 p-8 text-center shadow-2xl shadow-orange-900/10">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />

                        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />

                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                            {result.winner
                                ? result.winner.toLowerCase() === brandName.toLowerCase()
                                    ? `🎉 ${brandName} Wins!`
                                    : `${result.winner} Takes the Lead`
                                : "It's a Draw!"}
                        </h2>
                        <p className="text-[var(--text-muted)] max-w-xl mx-auto">
                            {result.winnerReason || "No clear winner detected."}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Your Stats */}
                        <Card className="bg-[var(--surface)] border-[var(--border)] border-l-4 border-l-violet-500">
                            <CardHeader>
                                <CardTitle>{brandName}</CardTitle>
                                <CardDescription>Your Performance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-muted)]">Position</span>
                                    <Badge variant={result.mentionPosition === 1 ? "default" : "outline"}>
                                        #{result.mentionPosition || "-"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-muted)]">Sentiment</span>
                                    <div className="flex items-center gap-2">
                                        {result.sentiment === 'positive' && <TrendingUp className="w-4 h-4 text-green-400" />}
                                        {result.sentiment === 'negative' && <TrendingDown className="w-4 h-4 text-red-400" />}
                                        {result.sentiment === 'neutral' && <Minus className="w-4 h-4 text-[var(--text-muted)]" />}
                                        <span className="capitalize text-[var(--text-primary)]">{result.sentiment || "N/A"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Competitor Stats */}
                        <Card className="bg-[var(--surface)] border-[var(--border)] border-l-4 border-l-orange-500">
                            <CardHeader>
                                <CardTitle>{competitorName}</CardTitle>
                                <CardDescription>Competitor Performance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-muted)]">Position</span>
                                    <Badge variant="outline">
                                        #{(result.competitorPositions || []).find(c => c.name.toLowerCase().includes(competitorName.toLowerCase()))?.position || "-"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[var(--text-muted)]">Mentions</span>
                                    <span className="text-[var(--text-primary)]">
                                        {(result.competitorsMentioned || []).some(c => c.toLowerCase().includes(competitorName.toLowerCase())) ? "Yes" : "No"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* AI Response Snippet */}
                    <Card className="bg-[var(--surface)] border-[var(--border)]">
                        <CardHeader>
                            <CardTitle>AI Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap">
                                {result.response}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
