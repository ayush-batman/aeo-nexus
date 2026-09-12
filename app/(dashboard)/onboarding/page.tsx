"use client";

import { useState, useEffect, useRef } from "react";
import { waitForPacket } from '@/lib/client/wait-for-packet';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowRight,
    ArrowLeft,
    Building,
    Globe,
    Search,
    CheckCircle,
    Loader2,
    Sparkles,
} from "lucide-react";

type ConfidenceLevel = "none" | "low" | "medium" | "high";

interface DecisionPacket {
    id: string;
    contractVersion: string;
    status: "complete" | "partial" | "all_failed" | "untracked";
    brandName: string;
    createdAt: string;
    prompts: string[];
    sourceGaps: Array<{ domain: string; citations: number; engines: string[]; exampleUrl: string }>;
    rankedAction: { title: string; rationale: string; prompt: string | null; sourceDomain: string | null };
    measurements: Array<{
        runId: string;
        prompt: string;
        status: "complete" | "partial" | "all_failed" | "untracked";
        persistence: { status: "stored" | "failed" | "not_applicable" };
        engines: Array<{
            engine: string;
            mentionRate: number | null;
            successfulSamples: number;
            failedSamples: number;
            confidence: { level: ConfidenceLevel };
            citations: Array<{ url: string; title: string; provenance: string }>;
            evidence: Array<{ sampleNumber: number; status: string; responseSnippet: string | null; error: string | null }>;
        }>;
    }>;
}

const steps = [
    { id: 1, title: "Welcome" },
    { id: 2, title: "Add Your Brand" },
    { id: 3, title: "Buyer Prompts" },
    { id: 4, title: "Decision Packet" },
    { id: 5, title: "Complete" },
];

function suggestedPrompts(brand: string, industry: string, audience: string): string[] {
    const category = industry ? industry.replaceAll('_', ' ') : 'software';
    const buyer = audience.trim() || 'growing teams';
    return [
        `What are the best ${category} tools for ${buyer}?`,
        `${brand} vs the leading alternatives for ${buyer}`,
        `Which ${category} platform should ${buyer} choose and why?`,
    ];
}

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [prompts, setPrompts] = useState<string[]>([]);
    const [decisionPacket, setDecisionPacket] = useState<DecisionPacket | null>(null);
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
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const packetRequest = useRef<{ prompts: string; id: string } | null>(null);

    useEffect(() => {
        async function getContext() {
            try {
                const [res, packetRes] = await Promise.all([
                    fetch('/api/onboarding/context'),
                    fetch('/api/onboarding/decision-packet', { cache: 'no-store' }),
                ]);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data?.error || 'Failed to load onboarding context');
                }

                setWorkspaceId(data.workspaceId);
                if (packetRes.ok) {
                    const packetData = await packetRes.json() as { packet?: DecisionPacket | null; pending?: boolean; packetId?: string };
                    if (packetData.pending && packetData.packetId) {
                        setScanning(true);
                        try { packetData.packet = await waitForPacket(`/api/onboarding/decision-packet?id=${packetData.packetId}`); }
                        finally { setScanning(false); }
                    }
                    if (packetData.packet) {
                        setDecisionPacket(packetData.packet);
                        setBrandName(packetData.packet.brandName);
                        setPrompts(packetData.packet.prompts);
                        setCurrentStep(4);
                    }
                }
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

            if (prompts.length < 3) setPrompts(suggestedPrompts(brandName, industry, targetAudience));
            setCurrentStep(3);
        } catch (error) {
            console.error('Error saving brand:', error);
            setError(error instanceof Error ? error.message : 'Failed to save brand');
        } finally {
            setLoading(false);
        }
    }

    async function runDecisionPacket() {
        if (!brandName || !workspaceId || prompts.length < 3) return;
        setScanning(true);
        setError(null);

        try {
            const fingerprint = JSON.stringify(prompts);
            if (packetRequest.current?.prompts !== fingerprint) packetRequest.current = { prompts: fingerprint, id: crypto.randomUUID() };
            const response = await fetch('/api/onboarding/decision-packet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Idempotency-Key': packetRequest.current.id },
                body: JSON.stringify({ prompts }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message || data?.error || 'Scan failed');
            }
            const packet = response.status === 202 ? await waitForPacket(data.statusUrl) : data.packet as DecisionPacket;
            setDecisionPacket(packet);
            packetRequest.current = null;
            setCurrentStep(4);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'The packet could not be completed. Please retry.');
        } finally {
            setScanning(false);
        }
    }

    async function completeOnboarding() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/onboarding/complete', { method: 'POST' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || `Could not finish onboarding (${res.status})`);
            }
            router.push('/dashboard');
            router.refresh();
        } catch (error) {
            console.error('Error completing onboarding:', error);
            setError(error instanceof Error ? error.message : 'Could not finish onboarding. Please retry.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] px-5 py-10 sm:px-8 lg:px-16 lg:py-14">
            <div className="mx-auto w-full max-w-4xl">
                {/* Progress */}
                <div className="mb-10 grid grid-cols-5 border-y border-[var(--border-default)]" aria-label="Onboarding progress">
                    {steps.map((step) => (
                        <div key={step.id} className={`relative min-w-0 border-r border-[var(--border-subtle)] px-2 py-4 last:border-r-0 sm:px-4 ${currentStep === step.id ? "bg-[var(--bg-raised)]" : ""}`}>
                            <div
                                className={`font-mono text-xs ${currentStep >= step.id ? "text-[var(--accent-base)]" : "text-[var(--text-ghost)]"}`}
                            >
                                {currentStep > step.id ? (
                                    <CheckCircle aria-label={`${step.title} complete`} className="h-4 w-4" />
                                ) : (
                                    `0${step.id}`
                                )}
                            </div>
                            <p className={`mt-2 truncate text-[10px] sm:text-xs ${currentStep === step.id ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{step.title}</p>
                            {currentStep === step.id ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent-base)]" /> : null}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-[var(--data-red-muted)] border border-[var(--data-red)]/25 text-[var(--data-red)] text-sm text-center" role="alert" aria-live="assertive">
                        {error}
                    </div>
                )}

                {/* Step 1: Welcome */}
                {currentStep === 1 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="grid gap-10 p-6 sm:p-8 lg:grid-cols-[.8fr_1.2fr] lg:p-10">
                            <div>
                                <p className="font-mono text-xs uppercase tracking-widest text-[var(--accent-base)]">Your first useful result</p>
                                <h1 className="mt-4 text-4xl font-medium tracking-tight text-[var(--text-primary)] sm:text-5xl">Read what AI says when a buyer asks about your category.</h1>
                                <p className="mt-5 text-base leading-relaxed text-[var(--text-secondary)]">Add the brand, review three to five editable buyer questions, and let Aelo collect repeated answers. A complete packet can take several minutes.</p>
                                <Button className="mt-8" size="lg" onClick={() => setCurrentStep(2)}>
                                Add my brand
                                <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                            <div className="bg-[var(--bg-evidence)] p-6 text-[var(--text-evidence)] shadow-[var(--shadow-md)]">
                                <p className="border-b border-[var(--border-evidence)] pb-4 font-mono text-xs uppercase tracking-widest text-[#65736f]">What the packet keeps</p>
                                <div className="mt-6 space-y-5">{[["01", "Repeated answers", "Four samples per available, plan-approved engine."], ["02", "Evidence and failures", "Returned citations remain attached; failed samples stay failed."], ["03", "One investigation", "A prompt or source gap with the reason it was ranked."]].map(([number, title, copy]) => <div key={number} className="grid grid-cols-[36px_1fr] gap-3"><span className="font-mono text-xs text-[#416a88]">{number}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-relaxed text-[#53615d]">{copy}</p></div></div>)}</div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Add Brand */}
                {currentStep === 2 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                                    <Building className="w-5 h-5 text-[var(--accent-base)]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Add your brand</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">This identity is used for exact mention matching.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="onboarding-brand-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Brand or company name *
                                    </label>
                                    <Input
                                        id="onboarding-brand-name"
                                        placeholder="e.g., Acme Inc"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="onboarding-website" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Website
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" />
                                            <Input
                                                id="onboarding-website"
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
                                            className="bg-[var(--accent-muted)] text-[var(--accent-base)] hover:bg-[var(--accent-muted)] border border-[var(--accent-base)]/25 whitespace-nowrap"
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
                                        Enter your URL and we&apos;ll auto-detect your brand details.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="onboarding-industry" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Industry
                                    </label>
                                    <select
                                        id="onboarding-industry"
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
                                <Button onClick={handleSaveBrand} disabled={!brandName || !workspaceId || loading}>
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : null}
                                    {!workspaceId ? 'Loading workspace…' : 'Continue'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Review buyer prompts */}
                {currentStep === 3 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center">
                                    <Search className="w-5 h-5 text-[var(--accent-base)]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-[var(--text-primary)]">Choose buyer prompts</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Edit the questions that should put &quot;{brandName}&quot; on a buyer&apos;s shortlist.</p>
                                </div>
                            </div>

                            <div className="space-y-3" aria-live="polite">
                                {prompts.map((prompt, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <label htmlFor={`buyer-prompt-${index}`} className="w-6 flex-shrink-0 font-mono text-xs text-[var(--text-tertiary)]">
                                            {index + 1}
                                        </label>
                                        <Input
                                            id={`buyer-prompt-${index}`}
                                            value={prompt}
                                            maxLength={500}
                                            onChange={(event) => setPrompts(current => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))}
                                            aria-label={`Buyer prompt ${index + 1}`}
                                        />
                                        {prompts.length > 3 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setPrompts(current => current.filter((_, itemIndex) => itemIndex !== index))}
                                                aria-label={`Remove buyer prompt ${index + 1}`}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                                <p className="text-xs text-[var(--text-tertiary)]">Aelo asks every available, plan-approved engine four times per prompt.</p>
                                {prompts.length < 5 && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setPrompts(current => [...current, ""])}>
                                        Add prompt
                                    </Button>
                                )}
                            </div>

                            {scanning && (
                                <div className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] p-4" role="status" aria-live="polite">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-base)]" />
                                        <div>
                                            <p className="text-sm font-medium text-[var(--text-primary)]">Building your decision packet</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Collecting repeated answers, failures, confidence, and grounded sources. This can take several minutes.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <Button variant="ghost" onClick={() => setCurrentStep(2)} disabled={scanning}>
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                    <Button variant="ghost" onClick={() => setCurrentStep(5)} disabled={scanning}>Skip for now</Button>
                                    <Button
                                        onClick={runDecisionPacket}
                                        disabled={scanning || prompts.length < 3 || prompts.some(prompt => !prompt.trim())}
                                    >
                                        {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                        Build decision packet
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Decision packet */}
                {currentStep === 4 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-6 sm:p-8">
                            {decisionPacket ? (
                                <DecisionPacketView packet={decisionPacket} onContinue={() => setCurrentStep(5)} />
                            ) : (
                                <div className="py-10 text-center">
                                    <p className="text-[var(--text-secondary)]">The saved packet is unavailable.</p>
                                    <Button className="mt-4" onClick={() => setCurrentStep(3)}>Return to prompts</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Step 5: Complete */}
                {currentStep === 5 && (
                    <Card className="border-[var(--border-default)] bg-[var(--bg-surface)]">
                        <CardContent className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--data-green-muted)] flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-[var(--data-green)]" />
                            </div>
                                <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">
                                    Your workspace is ready.
                                </h2>
                                <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                                    &quot;{brandName}&quot; is saved. Open Overview to inspect the packet you just created, or Prompts &amp; Scans to start a new measurement.
                                </p>

                            <div className="mb-8 border-y border-[var(--border-default)] text-left">
                                <div className="grid gap-1 border-b border-[var(--border-default)] py-4 sm:grid-cols-[160px_1fr]"><h3 className="font-medium text-[var(--text-primary)]">Overview</h3><p className="text-sm text-[var(--text-secondary)]">Read the finding, sampled answer and confidence range.</p></div>
                                <div className="grid gap-1 py-4 sm:grid-cols-[160px_1fr]"><h3 className="font-medium text-[var(--text-primary)]">Prompts &amp; Scans</h3><p className="text-sm text-[var(--text-secondary)]">Run or schedule the next compatible measurement.</p></div>
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

function DecisionPacketView({ packet, onContinue }: { packet: DecisionPacket; onContinue: () => void }) {
    const partial = packet.status === "partial" || packet.status === "untracked";
    const failed = packet.status === "all_failed";
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">{packet.contractVersion}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Your first decision packet</h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Repeated answers, source evidence, and one ranked next move.</p>
                </div>
                <Badge variant={failed ? "destructive" : partial ? "outline" : "success"}>{packet.status.replace('_', ' ')}</Badge>
            </div>

            {(partial || failed) && (
                <div className="rounded-lg border border-[var(--data-amber)]/30 bg-[var(--data-amber-muted)] p-4 text-sm text-[var(--text-secondary)]" role="status">
                    {failed
                        ? "Every provider call failed. Aelo saved the failure state and did not turn it into zero visibility."
                        : packet.status === "untracked"
                            ? "Answers were collected, but at least one cohort was not stored. Treat this packet as untracked and retry."
                            : "Some provider samples failed. The successful sample count and failures stay visible below."}
                </div>
            )}

            <div className="space-y-4">
                {packet.measurements.map((measurement, promptIndex) => (
                    <section key={measurement.runId} className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-raised)] p-4" aria-labelledby={`packet-prompt-${promptIndex}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <h3 id={`packet-prompt-${promptIndex}`} className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">{measurement.prompt}</h3>
                            <span className="font-mono text-[10px] uppercase text-[var(--text-tertiary)]">{measurement.status.replace('_', ' ')}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {measurement.engines.map(engine => (
                                <div key={engine.engine} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="text-sm font-medium capitalize text-[var(--text-primary)]">{engine.engine}</span>
                                        <span className="font-mono text-lg text-[var(--text-primary)]">
                                            {engine.mentionRate === null ? "—" : `${Math.round(engine.mentionRate * 100)}%`}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                        n={engine.successfulSamples} successful · {engine.failedSamples} failed · {engine.confidence.level} confidence
                                    </p>
                                    {engine.citations.filter(citation => citation.provenance === "provider_citation").slice(0, 2).map(citation => (
                                        <a
                                            key={citation.url}
                                            href={citation.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 block truncate text-xs text-[var(--accent-base)] underline underline-offset-2"
                                        >
                                            {citation.title || citation.url}
                                        </a>
                                    ))}
                                    <details className="mt-3 text-xs text-[var(--text-secondary)]">
                                        <summary className="cursor-pointer py-1 font-medium text-[var(--text-primary)]">Open sample receipt</summary>
                                        <div className="mt-2 space-y-2">
                                            {engine.evidence.map(sample => (
                                                <div key={sample.sampleNumber} className="rounded border border-[var(--border-subtle)] p-2">
                                                    <span className="font-mono text-[10px] uppercase text-[var(--text-tertiary)]">Sample {sample.sampleNumber} · {sample.status}</span>
                                                    <p className="mt-1 leading-relaxed">{sample.error || sample.responseSnippet || "No snippet returned."}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <section className="rounded-lg border border-[var(--accent-base)]/30 bg-[var(--accent-muted)] p-5" aria-labelledby="ranked-action-title">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent-base)]">Ranked action · 01</p>
                <h3 id="ranked-action-title" className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{packet.rankedAction.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{packet.rankedAction.rationale}</p>
                {packet.rankedAction.prompt && <p className="mt-3 border-l-2 border-[var(--accent-base)] pl-3 text-xs text-[var(--text-secondary)]">Target prompt: {packet.rankedAction.prompt}</p>}
            </section>

            {packet.sourceGaps.length > 0 && (
                <section aria-labelledby="source-gaps-title">
                    <h3 id="source-gaps-title" className="text-sm font-medium text-[var(--text-primary)]">Provider-backed source gaps</h3>
                    <div className="mt-2 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-default)]">
                        {packet.sourceGaps.slice(0, 3).map(gap => (
                            <a key={gap.domain} href={gap.exampleUrl} target="_blank" rel="noreferrer" className="flex min-h-11 flex-col items-start justify-between gap-1 px-3 py-2 text-sm hover:bg-[var(--bg-raised)] sm:flex-row sm:items-center sm:gap-3">
                                <span className="truncate text-[var(--text-primary)]">{gap.domain}</span>
                                <span className="font-mono text-xs text-[var(--text-tertiary)] sm:flex-shrink-0">{gap.citations} citations · {gap.engines.join(', ')}</span>
                            </a>
                        ))}
                    </div>
                </section>
            )}

            <div className="flex justify-end">
                <Button onClick={onContinue}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
