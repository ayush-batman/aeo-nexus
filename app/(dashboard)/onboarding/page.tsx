"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
    Zap,
    ArrowRight,
    ArrowLeft,
    Building,
    Globe,
    Search,
    CheckCircle,
    Loader2,
    TrendingUp,
    MessageSquare,
    FileText,
    Sparkles,
} from "lucide-react";

interface ScanResult {
    platform: string;
    mentioned: boolean;
    sentiment: string;
    score: number;
}

const steps = [
    { id: 1, title: "Welcome" },
    { id: 2, title: "Add Your Brand" },
    { id: 3, title: "First Scan" },
    { id: 4, title: "Complete" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function handleAutoFill() {
        if (!website) return;
        setEnriching(true);
        setError(null);
        try {
            const res = await fetch('/api/brand/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: website }),
            });
            const data = await res.json();

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Auto-fill failed');
            }

            if (data.data) {
                setBrandName(data.data.name || brandName);
                setDescription(data.data.description || '');
                setTargetAudience(data.data.targetAudience || '');
                // Simple heuristic to match industry
                const apiIndustry = (data.data.industry || '').toLowerCase();
                if (apiIndustry.includes('saas')) setIndustry('saas');
                else if (apiIndustry.includes('commerce')) setIndustry('ecommerce');
                else if (apiIndustry.includes('fintech')) setIndustry('fintech');
                else if (apiIndustry.includes('health')) setIndustry('healthcare');
                else if (apiIndustry.includes('education')) setIndustry('education');
                else if (apiIndustry.includes('agency')) setIndustry('agency');
                else setIndustry('other');
            }
        } catch (error) {
            console.error("Auto-fill failed", error);
            setError(error instanceof Error ? error.message : 'Auto-fill failed');
        } finally {
            setEnriching(false);
        }
    }

    // Form data
    const [brandName, setBrandName] = useState("");
    const [website, setWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [description, setDescription] = useState("");
    const [targetAudience, setTargetAudience] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    useEffect(() => {
        async function getContext() {
            try {
                const res = await fetch('/api/onboarding/context');
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to load onboarding context');
                }

                setUserId(data.userId);
                setOrgId(data.orgId);
                setWorkspaceId(data.workspaceId);
            } catch (err) {
                console.error('Onboarding context error:', err);
                setError(err instanceof Error ? err.message : 'Failed to load onboarding context');
            }
        }
        getContext();
    }, []);

    async function handleSaveBrand() {
        if (!brandName || !workspaceId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/onboarding/brand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brandName,
                    website,
                    industry,
                    description,
                    targetAudience,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to save brand');
            }

            setCurrentStep(3);
        } catch (error) {
            console.error('Error saving brand:', error);
            setError(error instanceof Error ? error.message : 'Failed to save brand');
        } finally {
            setLoading(false);
        }
    }

    async function runFirstScan() {
        if (!brandName || !workspaceId) return;
        setScanning(true);
        setError(null);

        try {
            const response = await fetch('/api/llm/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `What is ${brandName}?`,
                    brandName,
                    platforms: undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Scan failed');
            }

            // Format results
            const results: ScanResult[] = (data.results || []).map((r: { platform: string; brandMentioned: boolean; sentiment: string; confidence: number }) => ({
                platform: r.platform,
                mentioned: r.brandMentioned,
                sentiment: r.sentiment || 'neutral',
                score: Math.round((r.confidence ?? 0.6) * 100),
            }));

            if (results.length === 0) {
                setError("No results found. The LLM platforms may be unavailable.");
            } else {
                setScanResults(results);
            }
        } catch (error) {
            console.error('Scan API failed:', error);
            setError(error instanceof Error ? error.message : 'Scan failed to complete. Please try again or check your API keys.');
        } finally {
            setScanning(false);
        }
    }

    async function completeOnboarding() {
        setLoading(true);

        try {
            const supabase = createClient();

            // Mark onboarding complete
            if (userId) {
                await supabase
                    .from('users')
                    .update({ onboarding_completed: true })
                    .eq('id', userId);
            }

            router.push('/dashboard');
        } catch (error) {
            console.error('Error completing onboarding:', error);
            router.push('/dashboard');
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${currentStep > step.id
                                    ? "bg-green-500 text-white"
                                    : currentStep === step.id
                                        ? "bg-indigo-500 text-white"
                                        : "bg-[var(--bg-raised)] text-[var(--text-ghost)]"
                                    }`}
                            >
                                {currentStep > step.id ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    step.id
                                )}
                            </div>
                            {i < steps.length - 1 && (
                                <div
                                    className={`w-12 h-0.5 mx-1 ${currentStep > step.id ? "bg-green-500" : "bg-[var(--bg-raised)]"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Step 1: Welcome */}
                {currentStep === 1 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
                                Welcome to Aelo!
                            </h1>
                            <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                                Let&apos;s set up your brand and run your first AI visibility scan in under 2 minutes.
                            </p>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                    <TrendingUp className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                                    <p className="text-sm text-[var(--text-secondary)]">Track AI Visibility</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                    <MessageSquare className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                                    <p className="text-sm text-[var(--text-secondary)]">Discover Forums</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                    <FileText className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                                    <p className="text-sm text-[var(--text-secondary)]">Optimize Content</p>
                                </div>
                            </div>

                            <Button size="lg" onClick={() => setCurrentStep(2)}>
                                Get Started
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Add Brand */}
                {currentStep === 2 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Building className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add Your Brand</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Tell us about your brand to start tracking</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Brand/Company Name *
                                    </label>
                                    <Input
                                        placeholder="e.g., Acme Inc"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Website
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
                                            <Input
                                                className="pl-10"
                                                placeholder="https://example.com"
                                                value={website}
                                                onChange={(e) => setWebsite(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={handleAutoFill}
                                            disabled={!website || enriching}
                                            className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 whitespace-nowrap"
                                        >
                                            {enriching ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4 mr-2" />
                                            )}
                                            Auto-Fill
                                        </Button>
                                    </div>
                                    <p className="text-xs text-[var(--text-ghost)] mt-2">
                                        Enter your URL and we'll auto-detect your brand details.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Industry
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)] text-[var(--text-primary)]"
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                    >
                                        <option value="">Select industry</option>
                                        <option value="saas">SaaS / Software</option>
                                        <option value="ecommerce">E-commerce</option>
                                        <option value="fintech">Fintech</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="education">Education</option>
                                        <option value="agency">Marketing Agency</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-8">
                                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <Button onClick={handleSaveBrand} disabled={!brandName || loading}>
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : null}
                                    Continue
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: First Scan */}
                {currentStep === 3 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Search className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Your First AI Scan</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">See how &quot;{brandName}&quot; appears in AI answers</p>
                                </div>
                            </div>

                            {scanResults.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-600/20 flex items-center justify-center mx-auto mb-6">
                                        <Sparkles className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <p className="text-[var(--text-secondary)] mb-6">
                                        Ready to scan &quot;{brandName}&quot; across Gemini and Claude?
                                    </p>
                                    <Button size="lg" onClick={runFirstScan} disabled={scanning}>
                                        {scanning ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Scanning AI platforms...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4 mr-2" />
                                                Run First Scan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {scanResults.map((result, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-raised)]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-raised)] flex items-center justify-center">
                                                        <span className="text-sm font-medium capitalize">
                                                            {result.platform[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-[var(--text-primary)] capitalize">
                                                            {result.platform}
                                                        </p>
                                                        <p className="text-sm text-[var(--text-ghost)]">
                                                            {result.mentioned ? "Brand mentioned" : "Not mentioned"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge
                                                        variant={
                                                            result.sentiment === "positive"
                                                                ? "success"
                                                                : result.sentiment === "negative"
                                                                    ? "destructive"
                                                                    : "outline"
                                                        }
                                                    >
                                                        {result.sentiment}
                                                    </Badge>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-[var(--text-primary)]">{result.score}%</p>
                                                        <p className="text-xs text-[var(--text-ghost)]">visibility</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center mb-6">
                                        <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                        <p className="text-green-300">
                                            Your first scan is complete! You can now track your visibility over time.
                                        </p>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button onClick={() => setCurrentStep(4)}>
                                            Continue
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Complete */}
                {currentStep === 4 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
                                You&apos;re All Set!
                            </h2>
                            <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                                Your brand &quot;{brandName}&quot; is now being tracked. Explore the dashboard to see more insights.
                            </p>

                            <div className="grid grid-cols-3 gap-4 mb-8 text-left">
                                <div className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                    <h3 className="font-medium text-[var(--text-primary)] mb-1">LLM Tracker</h3>
                                    <p className="text-xs text-[var(--text-ghost)]">Monitor brand mentions across AI platforms</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                    <h3 className="font-medium text-[var(--text-primary)] mb-1">Forum Hub</h3>
                                    <p className="text-xs text-[var(--text-ghost)]">Discover and engage with relevant discussions</p>
                                </div>
                                <div className="p-4 rounded-lg bg-[var(--bg-raised)]">
                                    <h3 className="font-medium text-[var(--text-primary)] mb-1">Content Studio</h3>
                                    <p className="text-xs text-[var(--text-ghost)]">Optimize content for AI citations</p>
                                </div>
                            </div>

                            <Button size="lg" onClick={completeOnboarding} disabled={loading}>
                                {loading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : null}
                                Go to Dashboard
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
