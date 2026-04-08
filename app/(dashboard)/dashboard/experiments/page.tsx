"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    FlaskConical,
    Loader2,
    Plus,
    Trash2,
    Play,
    Pause,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    CheckCircle,
    AlertCircle,
    Beaker,
} from "lucide-react";

interface Experiment {
    id: string;
    name: string;
    status: "draft" | "baseline" | "running" | "completed";
    hypothesis: string | null;
    test_questions: string[];
    control_questions: string[];
    baseline_data: Record<string, number> | null;
    result_data: Record<string, number> | null;
    created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "bg-gray-500/10", text: "text-gray-400", label: "Draft" },
    baseline: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Collecting Baseline" },
    running: { bg: "bg-green-500/10", text: "text-green-400", label: "Running" },
    completed: { bg: "bg-indigo-500/10", text: "text-indigo-400", label: "Completed" },
};

export default function ExperimentsPage() {
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    // Create form state
    const [name, setName] = useState("");
    const [hypothesis, setHypothesis] = useState("");
    const [testQuestionsText, setTestQuestionsText] = useState("");
    const [controlQuestionsText, setControlQuestionsText] = useState("");

    useEffect(() => {
        fetchExperiments();
    }, []);

    const fetchExperiments = async () => {
        try {
            const res = await fetch("/api/experiments");
            const data = await res.json();
            setExperiments(data.experiments || []);
        } catch (err) {
            console.error("Error fetching experiments:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim() || !testQuestionsText.trim() || !controlQuestionsText.trim()) return;
        setCreating(true);

        try {
            const testQuestions = testQuestionsText.split("\n").map(q => q.trim()).filter(Boolean);
            const controlQuestions = controlQuestionsText.split("\n").map(q => q.trim()).filter(Boolean);

            const res = await fetch("/api/experiments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, hypothesis, testQuestions, controlQuestions }),
            });

            if (res.ok) {
                setShowCreate(false);
                setName("");
                setHypothesis("");
                setTestQuestionsText("");
                setControlQuestionsText("");
                fetchExperiments();
            }
        } catch (err) {
            console.error("Error creating experiment:", err);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch("/api/experiments", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            setExperiments(prev => prev.filter(e => e.id !== id));
        } catch (err) {
            console.error("Error deleting experiment:", err);
        }
    };

    return (
        <>
            <Header
                title="Experiments"
                description="Test AEO strategies with controlled experiments"
            />

            <div className="p-6 space-y-6">
                {/* Info Banner */}
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                    <div className="flex items-start gap-3">
                        <FlaskConical className="w-5 h-5 text-indigo-400 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Why Experiment?</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                Most AEO &quot;best practices&quot; are unproven. Experiments with control groups let you isolate what actually works.
                                Split your questions into test (where you intervene) and control (no changes) groups, then measure the lift.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Experiments</h2>
                    <Button
                        onClick={() => setShowCreate(!showCreate)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" /> New Experiment
                    </Button>
                </div>

                {/* Create Form */}
                {showCreate && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Create Experiment</CardTitle>
                            <CardDescription>Define your test and control question groups</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                                    Experiment Name *
                                </label>
                                <Input
                                    placeholder="e.g. Reddit engagement impact on CRM mentions"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                                    Hypothesis
                                </label>
                                <Input
                                    placeholder="e.g. Answering Reddit questions will increase SoV by 20%"
                                    value={hypothesis}
                                    onChange={(e) => setHypothesis(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                                        🧪 Test Questions * <span className="text-[var(--text-ghost)]">(one per line)</span>
                                    </label>
                                    <textarea
                                        className="w-full min-h-[150px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y"
                                        placeholder={"best CRM for small business?\nwhich CRM has the best integrations?\ntop CRM software 2025"}
                                        value={testQuestionsText}
                                        onChange={(e) => setTestQuestionsText(e.target.value)}
                                    />
                                    <p className="text-[10px] text-[var(--text-ghost)] mt-1">
                                        {testQuestionsText.split("\n").filter(Boolean).length} questions — you will make AEO interventions for these
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                                        🔬 Control Questions * <span className="text-[var(--text-ghost)]">(one per line)</span>
                                    </label>
                                    <textarea
                                        className="w-full min-h-[150px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y"
                                        placeholder={"best project management tool?\nwhich PM software is most popular?\ntop project management app 2025"}
                                        value={controlQuestionsText}
                                        onChange={(e) => setControlQuestionsText(e.target.value)}
                                    />
                                    <p className="text-[10px] text-[var(--text-ghost)] mt-1">
                                        {controlQuestionsText.split("\n").filter(Boolean).length} questions — no interventions, used as baseline comparison
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={creating || !name.trim() || !testQuestionsText.trim() || !controlQuestionsText.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Experiment"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Experiments List */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => (
                            <div key={i} className="h-32 rounded-xl bg-[var(--bg-surface)] animate-pulse" />
                        ))}
                    </div>
                ) : experiments.length > 0 ? (
                    <div className="space-y-4">
                        {experiments.map((exp) => {
                            const statusStyle = STATUS_STYLES[exp.status] || STATUS_STYLES.draft;
                            const testCount = exp.test_questions?.length || 0;
                            const controlCount = exp.control_questions?.length || 0;

                            return (
                                <Card key={exp.id}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{exp.name}</h3>
                                                    <Badge variant="outline" className={`text-[10px] ${statusStyle.bg} ${statusStyle.text}`}>
                                                        {statusStyle.label}
                                                    </Badge>
                                                </div>

                                                {exp.hypothesis && (
                                                    <p className="text-xs text-[var(--text-secondary)] mb-3 italic">&quot;{exp.hypothesis}&quot;</p>
                                                )}

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    <div className="rounded-lg bg-[var(--bg-raised)] p-3 border border-[var(--border-default)]">
                                                        <p className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-1">Test Questions</p>
                                                        <p className="text-lg font-bold font-display text-[var(--text-primary)]">{testCount}</p>
                                                    </div>
                                                    <div className="rounded-lg bg-[var(--bg-raised)] p-3 border border-[var(--border-default)]">
                                                        <p className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-1">Control Questions</p>
                                                        <p className="text-lg font-bold font-display text-[var(--text-primary)]">{controlCount}</p>
                                                    </div>
                                                    <div className="rounded-lg bg-[var(--bg-raised)] p-3 border border-[var(--border-default)]">
                                                        <p className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-1">Test SoV</p>
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-lg font-bold font-display text-[var(--text-primary)]">
                                                                {exp.result_data?.testSov != null ? `${exp.result_data.testSov}%` : "—"}
                                                            </p>
                                                            {exp.result_data?.testLift != null && (
                                                                <span className={`text-xs ${(exp.result_data.testLift as number) > 0 ? "text-green-400" : "text-red-400"}`}>
                                                                    {(exp.result_data.testLift as number) > 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                                                                    {Math.abs(exp.result_data.testLift as number)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-lg bg-[var(--bg-raised)] p-3 border border-[var(--border-default)]">
                                                        <p className="text-[10px] text-[var(--text-ghost)] uppercase tracking-wider mb-1">Control SoV</p>
                                                        <div className="flex items-center gap-1">
                                                            <p className="text-lg font-bold font-display text-[var(--text-primary)]">
                                                                {exp.result_data?.controlSov != null ? `${exp.result_data.controlSov}%` : "—"}
                                                            </p>
                                                            {exp.result_data?.controlLift != null && (
                                                                <span className="text-xs text-[var(--text-ghost)]">
                                                                    <Minus className="w-3 h-3 inline" /> stable
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Result Verdict */}
                                                {exp.status === "completed" && exp.result_data && (
                                                    <div className={`mt-3 p-3 rounded-lg border ${(exp.result_data.testLift as number) > 5
                                                            ? "border-green-500/20 bg-green-500/5"
                                                            : "border-gray-500/20 bg-gray-500/5"
                                                        }`}>
                                                        <div className="flex items-center gap-2">
                                                            {(exp.result_data.testLift as number) > 5 ? (
                                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                            ) : (
                                                                <AlertCircle className="w-4 h-4 text-gray-400" />
                                                            )}
                                                            <span className="text-xs text-[var(--text-secondary)]">
                                                                {(exp.result_data.testLift as number) > 5
                                                                    ? `Strategy working! Test group SoV increased by ${exp.result_data.testLift}% while control remained stable.`
                                                                    : "No significant difference detected between test and control groups."
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 ml-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(exp.id)}
                                                    className="h-8 w-8 p-0 text-[var(--text-ghost)] hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16 text-[var(--text-ghost)]">
                        <Beaker className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg mb-2">No experiments yet</p>
                        <p className="text-sm max-w-md mx-auto mb-4">
                            Create your first experiment to scientifically prove which AEO strategies work for your brand.
                        </p>
                        <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="w-4 h-4 mr-2" /> Create First Experiment
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
