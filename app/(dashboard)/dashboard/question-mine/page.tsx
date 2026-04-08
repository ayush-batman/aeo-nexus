"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Loader2,
    Sparkles,
    FileText,
    MessageSquare,
    HelpCircle,
    Copy,
    Check,
    BookmarkPlus,
    Filter,
    Lightbulb,
} from "lucide-react";

interface MinedQuestion {
    text: string;
    source: string;
    topic: string;
    type: string;
    priority: "high" | "medium" | "low";
    hasExistingContent: boolean;
}

const SOURCE_TYPES = [
    { id: "brainstorm", label: "AI Brainstorm", icon: Sparkles, description: "Generate questions from keywords" },
    { id: "transcript", label: "Sales/Support Transcript", icon: MessageSquare, description: "Extract from transcripts" },
    { id: "support", label: "Support Tickets", icon: HelpCircle, description: "Mine from support content" },
];

const TYPE_COLORS: Record<string, string> = {
    comparison: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "how-to": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    recommendation: "bg-green-500/10 text-green-400 border-green-500/20",
    troubleshooting: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    feature: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    pricing: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    integration: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    general: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const PRIORITY_STYLES: Record<string, string> = {
    high: "bg-red-500/10 text-red-400 border-red-500/20",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    low: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function QuestionMinePage() {
    const [sourceType, setSourceType] = useState("brainstorm");
    const [input, setInput] = useState("");
    const [brandName, setBrandName] = useState("");
    const [industry, setIndustry] = useState("");
    const [loading, setLoading] = useState(false);
    const [questions, setQuestions] = useState<MinedQuestion[]>([]);
    const [topics, setTopics] = useState<string[]>([]);
    const [filterTopic, setFilterTopic] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [savedQuestions, setSavedQuestions] = useState<Set<string>>(new Set());

    const handleMine = async () => {
        if (!input.trim() || !brandName.trim()) return;
        setLoading(true);

        try {
            const res = await fetch("/api/questions/mine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sourceType, input, brandName, industry }),
            });

            if (!res.ok) throw new Error("Failed to mine questions");

            const data = await res.json();
            setQuestions(data.questions || []);
            setTopics(data.topics || []);
            setFilterTopic(null);
            setFilterType(null);
        } catch (err) {
            console.error("Error mining questions:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleSaveToPrompts = async (question: string) => {
        try {
            const res = await fetch("/api/prompts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: question, category: "mined", ai_generated: true }),
            });
            if (res.ok) {
                setSavedQuestions(prev => new Set(prev).add(question));
            }
        } catch (err) {
            console.error("Error saving prompt:", err);
        }
    };

    const filteredQuestions = questions.filter(q => {
        if (filterTopic && q.topic !== filterTopic) return false;
        if (filterType && q.type !== filterType) return false;
        return true;
    });

    const stats = {
        total: questions.length,
        highPriority: questions.filter(q => q.priority === "high").length,
        gaps: questions.filter(q => !q.hasExistingContent).length,
        topics: topics.length,
    };

    return (
        <>
            <Header
                title="Question Mine"
                description="Discover the long-tail questions your audience is asking AI"
            />

            <div className="p-6 space-y-6">
                {/* Source Type Selector */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {SOURCE_TYPES.map((src) => (
                        <button
                            key={src.id}
                            onClick={() => setSourceType(src.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${sourceType === src.id
                                    ? "border-indigo-500/50 bg-indigo-500/5"
                                    : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-hover)]"
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <src.icon className={`w-4 h-4 ${sourceType === src.id ? "text-indigo-400" : "text-[var(--text-secondary)]"}`} />
                                <span className={`text-sm font-medium ${sourceType === src.id ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                                    {src.label}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-ghost)]">{src.description}</p>
                        </button>
                    ))}
                </div>

                {/* Input Section */}
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Brand Name *</label>
                                <Input
                                    placeholder="e.g. Stripe, Notion, Aelo"
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">Industry</label>
                                <Input
                                    placeholder="e.g. Payment Processing, Project Management"
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 block">
                                {sourceType === "brainstorm" ? "Keywords or Product Description *" : "Paste Content *"}
                            </label>
                            <textarea
                                className="w-full min-h-[120px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-y"
                                placeholder={
                                    sourceType === "brainstorm"
                                        ? "e.g. AI-powered payment processing, recurring billing, invoice automation..."
                                        : sourceType === "transcript"
                                            ? "Paste sales call or support transcript here..."
                                            : "Paste support tickets, FAQ content, or community questions here..."
                                }
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                        </div>

                        <Button
                            onClick={handleMine}
                            disabled={loading || !input.trim() || !brandName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mining Questions...</>
                            ) : (
                                <><Search className="w-4 h-4 mr-2" /> Mine Questions</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results */}
                {questions.length > 0 && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                                <p className="text-xs text-[var(--text-ghost)] uppercase tracking-wider">Total Questions</p>
                                <p className="text-2xl font-bold font-display text-[var(--text-primary)]">{stats.total}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                                <p className="text-xs text-[var(--text-ghost)] uppercase tracking-wider">High Priority</p>
                                <p className="text-2xl font-bold font-display text-red-400">{stats.highPriority}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                                <p className="text-xs text-[var(--text-ghost)] uppercase tracking-wider">Content Gaps</p>
                                <p className="text-2xl font-bold font-display text-orange-400">{stats.gaps}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
                                <p className="text-xs text-[var(--text-ghost)] uppercase tracking-wider">Topic Clusters</p>
                                <p className="text-2xl font-bold font-display text-indigo-400">{stats.topics}</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
                            <button
                                onClick={() => { setFilterTopic(null); setFilterType(null); }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filterTopic && !filterType
                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                        : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                                    }`}
                            >
                                All ({questions.length})
                            </button>
                            {topics.map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => { setFilterTopic(topic === filterTopic ? null : topic); setFilterType(null); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterTopic === topic
                                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                            : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-default)]"
                                        }`}
                                >
                                    {topic} ({questions.filter(q => q.topic === topic).length})
                                </button>
                            ))}
                        </div>

                        {/* Question List */}
                        <div className="space-y-2">
                            {filteredQuestions.map((q, i) => (
                                <div
                                    key={i}
                                    className={`p-4 rounded-xl border transition-all ${q.hasExistingContent
                                            ? "border-[var(--border-default)] bg-[var(--bg-surface)]"
                                            : "border-orange-500/20 bg-orange-500/5"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Lightbulb className={`w-3.5 h-3.5 flex-shrink-0 ${q.hasExistingContent ? "text-green-400" : "text-orange-400"}`} />
                                                <p className="text-sm font-medium text-[var(--text-primary)]">{q.text}</p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[q.type] || TYPE_COLORS.general}`}>
                                                    {q.type}
                                                </Badge>
                                                <Badge variant="outline" className={`text-[10px] ${PRIORITY_STYLES[q.priority]}`}>
                                                    {q.priority}
                                                </Badge>
                                                <span className="text-[10px] text-[var(--text-ghost)]">{q.topic}</span>
                                                {!q.hasExistingContent && (
                                                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/20">
                                                        GAP
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleCopy(q.text)}
                                                className="h-7 w-7 p-0"
                                            >
                                                {copiedId === q.text ? (
                                                    <Check className="w-3.5 h-3.5 text-green-400" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 text-[var(--text-ghost)]" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSaveToPrompts(q.text)}
                                                disabled={savedQuestions.has(q.text)}
                                                className="h-7 w-7 p-0"
                                            >
                                                <BookmarkPlus className={`w-3.5 h-3.5 ${savedQuestions.has(q.text) ? "text-indigo-400" : "text-[var(--text-ghost)]"}`} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Empty State */}
                {questions.length === 0 && !loading && (
                    <div className="text-center py-16 text-[var(--text-ghost)]">
                        <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg mb-2">Uncover what your audience asks AI</p>
                        <p className="text-sm max-w-md mx-auto">Paste transcripts, support tickets, or let AI brainstorm long-tail questions that your content should answer to win in AEO.</p>
                    </div>
                )}
            </div>
        </>
    );
}
