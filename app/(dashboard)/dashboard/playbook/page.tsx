"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    BookOpen,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Check,
    Target,
    HelpCircle,
    BarChart3,
    Rocket,
    Sparkles,
    Copy,
    Lightbulb,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface MoneyTerm {
    term: string;
    priority: "high" | "medium" | "low";
}

interface GeneratedQuestion {
    text: string;
    type: string;
    priority: string;
}

interface ContentGap {
    question: string;
    hasContent: boolean;
    recommendation: string;
}

interface ActionItem {
    action: string;
    type: "on-site" | "off-site";
    effort: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    channel: string;
}

const STEPS = [
    { num: 1 as Step, title: "Money Terms", icon: Target, desc: "Identify your most valuable terms" },
    { num: 2 as Step, title: "Questions", icon: HelpCircle, desc: "Generate related questions" },
    { num: 3 as Step, title: "Content Gaps", icon: BarChart3, desc: "Find what's missing" },
    { num: 4 as Step, title: "Action Plan", icon: Rocket, desc: "Prioritized strategy" },
];

export default function PlaybookPage() {
    const [step, setStep] = useState<Step>(1);
    const [brandName, setBrandName] = useState("");
    const [industry, setIndustry] = useState("");

    // Step 1
    const [moneyTerms, setMoneyTerms] = useState<MoneyTerm[]>([]);
    const [newTerm, setNewTerm] = useState("");

    // Step 2
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Step 3
    const [gaps, setGaps] = useState<ContentGap[]>([]);
    const [loadingGaps, setLoadingGaps] = useState(false);

    // Step 4
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [loadingActions, setLoadingActions] = useState(false);

    const addMoneyTerm = () => {
        if (!newTerm.trim()) return;
        setMoneyTerms(prev => [...prev, { term: newTerm.trim(), priority: "high" }]);
        setNewTerm("");
    };

    const removeTerm = (index: number) => {
        setMoneyTerms(prev => prev.filter((_, i) => i !== index));
    };

    const generateQuestions = async () => {
        if (moneyTerms.length === 0) return;
        setLoadingQuestions(true);

        try {
            const termsList = moneyTerms.map(t => t.term).join(", ");
            const res = await fetch("/api/questions/mine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceType: "brainstorm",
                    input: `Money terms: ${termsList}. Generate questions potential customers would ask AI about these topics.`,
                    brandName,
                    industry,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setQuestions(data.questions || []);
            }
        } catch (err) {
            console.error("Error generating questions:", err);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const analyzeGaps = async () => {
        setLoadingGaps(true);
        // Simulate gap analysis based on questions
        const analyzed: ContentGap[] = questions.slice(0, 20).map((q, i) => ({
            question: q.text,
            hasContent: i % 3 === 0, // Simulated — in production, would check actual content
            recommendation: i % 3 === 0
                ? "Content exists — optimize for AEO"
                : "No content found — create a dedicated page",
        }));
        setGaps(analyzed);
        setLoadingGaps(false);
    };

    const generateActionPlan = async () => {
        setLoadingActions(true);
        const gapCount = gaps.filter(g => !g.hasContent).length;
        const generatedActions: ActionItem[] = [
            ...(gapCount > 0 ? [{
                action: `Create ${gapCount} help center articles for unanswered questions`,
                type: "on-site" as const,
                effort: "medium" as const,
                impact: "high" as const,
                channel: "Help Center",
            }] : []),
            {
                action: `Optimize top pages to comprehensively answer questions about ${moneyTerms[0]?.term || 'your product'}`,
                type: "on-site" as const,
                effort: "medium" as const,
                impact: "high" as const,
                channel: "Website",
            },
            {
                action: "Respond to relevant Reddit threads with authentic, helpful answers",
                type: "off-site" as const,
                effort: "low" as const,
                impact: "high" as const,
                channel: "Reddit",
            },
            {
                action: `Create YouTube videos for niche ${industry || 'product'} questions`,
                type: "off-site" as const,
                effort: "high" as const,
                impact: "medium" as const,
                channel: "YouTube",
            },
            {
                action: "Get listed on relevant review sites (G2, Capterra)",
                type: "off-site" as const,
                effort: "medium" as const,
                impact: "high" as const,
                channel: "Review Sites",
            },
            {
                action: "Set up an AEO experiment with test/control groups to validate strategies",
                type: "on-site" as const,
                effort: "low" as const,
                impact: "high" as const,
                channel: "Aelo Experiments",
            },
        ];
        setActions(generatedActions);
        setLoadingActions(false);
    };

    const handleNext = async () => {
        if (step === 1 && moneyTerms.length > 0) {
            setStep(2);
            if (questions.length === 0) await generateQuestions();
        } else if (step === 2 && questions.length > 0) {
            setStep(3);
            if (gaps.length === 0) await analyzeGaps();
        } else if (step === 3) {
            setStep(4);
            if (actions.length === 0) await generateActionPlan();
        }
    };

    return (
        <>
            <Header
                title="AEO Playbook"
                description="Step-by-step strategy builder for Answer Engine Optimization"
            />

            <div className="p-6 space-y-6">
                {/* Brand Context Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                        placeholder="Brand name *"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                    />
                    <Input
                        placeholder="Industry (e.g. Payment Processing)"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                    />
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {STEPS.map((s, i) => (
                        <div key={s.num} className="flex items-center">
                            <button
                                onClick={() => s.num <= step && setStep(s.num)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${step === s.num
                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                                        : s.num < step
                                            ? "bg-green-500/5 text-green-400 border border-green-500/20 cursor-pointer"
                                            : "bg-[var(--bg-surface)] text-[var(--text-ghost)] border border-[var(--border-default)]"
                                    }`}
                            >
                                {s.num < step ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <s.icon className="w-3.5 h-3.5" />
                                )}
                                <span>{s.title}</span>
                            </button>
                            {i < STEPS.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-[var(--text-ghost)] mx-1 flex-shrink-0" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Target className="w-4 h-4 text-indigo-400" />
                                Identify Your Money Terms
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-[var(--text-secondary)]">
                                Money terms are the specific topics most valuable to your business. What would you want to rank #1 for when someone asks an AI assistant?
                            </p>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g. AI-powered CRM, best payment gateway for SaaS"
                                    value={newTerm}
                                    onChange={(e) => setNewTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && addMoneyTerm()}
                                />
                                <Button onClick={addMoneyTerm} variant="outline">Add</Button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {moneyTerms.map((t, i) => (
                                    <Badge
                                        key={i}
                                        variant="outline"
                                        className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1.5 cursor-pointer hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                                        onClick={() => removeTerm(i)}
                                    >
                                        {t.term} ×
                                    </Badge>
                                ))}
                            </div>

                            {moneyTerms.length === 0 && (
                                <div className="text-center py-8 text-[var(--text-ghost)]">
                                    <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Add at least one money term to proceed</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {step === 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <HelpCircle className="w-4 h-4 text-indigo-400" />
                                Generated Questions ({questions.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loadingQuestions ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
                                    <p className="text-sm text-[var(--text-secondary)]">Generating questions for your money terms...</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {questions.map((q, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]">
                                            <div className="flex items-center gap-2">
                                                <Lightbulb className="w-3.5 h-3.5 text-[var(--text-ghost)]" />
                                                <span className="text-sm text-[var(--text-primary)]">{q.text}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{q.type}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BarChart3 className="w-4 h-4 text-indigo-400" />
                                Content Gap Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loadingGaps ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
                                    <p className="text-sm text-[var(--text-secondary)]">Analyzing content gaps...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {gaps.map((g, i) => (
                                        <div
                                            key={i}
                                            className={`p-3 rounded-lg border ${g.hasContent
                                                    ? "border-green-500/20 bg-green-500/5"
                                                    : "border-orange-500/20 bg-orange-500/5"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm text-[var(--text-primary)]">{g.question}</p>
                                                    <p className="text-xs text-[var(--text-ghost)] mt-1">{g.recommendation}</p>
                                                </div>
                                                <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${g.hasContent ? "text-green-400" : "text-orange-400"
                                                    }`}>
                                                    {g.hasContent ? "✓ Covered" : "Gap"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {step === 4 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Rocket className="w-4 h-4 text-indigo-400" />
                                Your AEO Action Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {loadingActions ? (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-400" />
                                    <p className="text-sm text-[var(--text-secondary)]">Building your action plan...</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {actions.map((a, i) => (
                                        <div key={i} className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{a.action}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline" className={`text-[10px] ${a.type === "on-site" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                            }`}>
                                                            {a.type}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            Effort: {a.effort}
                                                        </Badge>
                                                        <Badge variant="outline" className={`text-[10px] ${a.impact === "high" ? "text-green-400" : "text-yellow-400"
                                                            }`}>
                                                            Impact: {a.impact}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px] text-[var(--text-ghost)]">
                                                            {a.channel}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setStep((step - 1) as Step)}
                        disabled={step === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={
                            step === 4 ||
                            (step === 1 && moneyTerms.length === 0) ||
                            (step === 1 && !brandName.trim()) ||
                            loadingQuestions
                        }
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {step === 3 ? "Generate Action Plan" : "Next"} <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </>
    );
}
