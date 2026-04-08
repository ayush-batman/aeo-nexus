"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Copy, AlertCircle, RefreshCw, Layers } from "lucide-react";

export function QuestionVariants() {
    const [baseQuestion, setBaseQuestion] = useState("");
    const [variants, setVariants] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!baseQuestion.trim()) return;

        setLoading(true);
        setError(null);
        setVariants([]);

        try {
            const res = await fetch("/api/llm/variants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ baseQuestion }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate variants");
            }

            setVariants(data.variants || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        Question Variant Generator
                    </CardTitle>
                    <CardDescription>
                        Generate variations of a base question to test your share of voice across different phrasing that users might ask AI agents.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter a base question (e.g., 'What is the best CRM for small business?')"
                            value={baseQuestion}
                            onChange={(e) => setBaseQuestion(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                            className="flex-1"
                        />
                        <Button onClick={handleGenerate} disabled={loading || !baseQuestion.trim()}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm mt-2 p-3 bg-red-500/10 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {variants.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Generated Variants ({variants.length})</h3>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(variants.join("\n"));
                                    }}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy All
                                </Button>
                            </div>
                            <div className="grid gap-3">
                                {variants.map((variant, i) => (
                                    <div key={i} className="p-3 bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg flex items-start justify-between gap-4 group">
                                        <p className="text-sm text-[var(--text-primary)]">{variant}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => navigator.clipboard.writeText(variant)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
