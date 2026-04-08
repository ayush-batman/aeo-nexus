"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    FileText,
    Code,
    CheckCircle,
    AlertCircle,
    Copy,
    Sparkles,
    Globe,
    Search,
    Zap,
    Loader2,
    Check,
    AlertTriangle,
    Info,
    ShieldCheck,
    Network,
    Lightbulb
} from "lucide-react";
import { TechnicalAudit } from "@/components/dashboard/content-studio/technical-audit";
import { TopicClustering } from "@/components/dashboard/content-studio/topic-clustering";
import { OriginalityScorer } from "@/components/dashboard/content-studio/originality-scorer";

const schemaTypes = [
    { id: "faq", name: "FAQ", icon: "❓", description: "Frequently Asked Questions" },
    { id: "product", name: "Product", icon: "📦", description: "Product information" },
    { id: "howto", name: "HowTo", icon: "📝", description: "Step-by-step guides" },
    { id: "article", name: "Article", icon: "📰", description: "News/Blog articles" },
    { id: "localbusiness", name: "Local Business", icon: "🏪", description: "Business info" },
];

interface AuditResult {
    url: string;
    score: number;
    readability: {
        score: number;
        issues: string[];
    };
    structure: {
        h1Count: number;
        h2Count: number;
        h3Count: number;
        hasSchema: boolean;
        schemaTypes: string[];
        metaDescription: boolean;
    };
    content: {
        wordCount: number;
        qnaCount: number;
    };
    summary: string;
}

export default function ContentStudioPage() {
    const [activeTab, setActiveTab] = useState<"analyzer" | "schema" | "writer" | "technical" | "clustering" | "originality">("analyzer");
    const [url, setUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [selectedSchema, setSelectedSchema] = useState("faq");
    const [generatedSchema, setGeneratedSchema] = useState("");
    const [schemaCopied, setSchemaCopied] = useState(false);

    // Schema Builder State
    const [schemaBrand, setSchemaBrand] = useState("");
    const [schemaDescription, setSchemaDescription] = useState("");
    const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
    const [schemaError, setSchemaError] = useState<string | null>(null);

    // AI Writer State
    const [writerContentType, setWriterContentType] = useState("Blog Post");
    const [writerTargetKeyword, setWriterTargetKeyword] = useState("");
    const [writerTopic, setWriterTopic] = useState("");
    const [isGeneratingWriter, setIsGeneratingWriter] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");
    const [writerError, setWriterError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!url.trim()) return;

        // Basic URL validation
        let targetUrl = url.trim();
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            targetUrl = "https://" + targetUrl;
        }

        setIsAnalyzing(true);
        setAuditError(null);
        setAuditResult(null);

        try {
            const res = await fetch("/api/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: targetUrl }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Analysis failed");
            }

            setAuditResult(data);
            setHasAnalyzed(true);
        } catch (err) {
            setAuditError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "Excellent";
        if (score >= 60) return "Good";
        if (score >= 40) return "Needs Work";
        return "Poor";
    };

    const copySchema = () => {
        if (generatedSchema) {
            navigator.clipboard.writeText(generatedSchema);
            setSchemaCopied(true);
            setTimeout(() => setSchemaCopied(false), 2000);
        }
    };

    const generateSchema = async () => {
        if (!schemaBrand.trim()) {
            setSchemaError('Brand Name is required');
            return;
        }

        setIsGeneratingSchema(true);
        setSchemaError(null);
        setGeneratedSchema("");

        try {
            const res = await fetch("/api/content/schema", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    schemaType: selectedSchema,
                    brandName: schemaBrand,
                    description: schemaDescription,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate schema");
            }

            setGeneratedSchema(JSON.stringify(data.schema, null, 2));
        } catch (err) {
            setSchemaError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsGeneratingSchema(false);
        }
    };

    const handleGenerateContent = async () => {
        if (!writerTopic.trim()) {
            setWriterError('Topic / Brief is required');
            return;
        }

        setIsGeneratingWriter(true);
        setWriterError(null);
        setGeneratedContent("");

        try {
            const res = await fetch("/api/content/writer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentType: writerContentType,
                    targetKeyword: writerTargetKeyword,
                    topic: writerTopic,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate content");
            }

            setGeneratedContent(data.content);
        } catch (err) {
            setWriterError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsGeneratingWriter(false);
        }
    };

    return (
        <>
            <Header
                title="Content Studio"
                description="Optimize your content for AI citations"
            />

            <div className="p-6 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-[var(--border-default)] pb-4">
                    {[
                        { id: "analyzer", label: "Content Analyzer", icon: Search },
                        { id: "originality", label: "Originality Scorer", icon: Lightbulb },
                        { id: "clustering", label: "Topic Clustering", icon: Network },
                        { id: "schema", label: "Schema Generator", icon: Code },
                        { id: "writer", label: "AI Writer", icon: Sparkles },
                        { id: "technical", label: "Technical Audit", icon: ShieldCheck },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Analyzer */}
                {activeTab === "analyzer" && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Analyze URL for AI Readiness</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter URL to analyze (e.g., https://yoursite.com/page)"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="flex-1"
                                        onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                                    />
                                    <Button onClick={handleAnalyze} disabled={isAnalyzing || !url.trim()}>
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            "Analyze"
                                        )}
                                    </Button>
                                </div>
                                {!hasAnalyzed && !isAnalyzing && (
                                    <div className="mt-12 text-center max-w-2xl mx-auto">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 mb-6">
                                            <Search className="w-8 h-8 text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Ready to optimize your content?</h3>
                                        <p className="text-[var(--text-secondary)] mb-8">
                                            Enter a URL above to get a comprehensive audit of your page's "Answer Engine Optimization" readiness.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                            {[
                                                { icon: Code, title: "Schema Check", desc: "Verify structured data" },
                                                { icon: FileText, title: "Content Depth", desc: "Word count & structure" },
                                                { icon: Zap, title: "Readability", desc: "Ease of AI parsing" }
                                            ].map((item, i) => (
                                                <div key={i} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)]">
                                                    <item.icon className="w-5 h-5 text-indigo-400 mb-2" />
                                                    <div className="font-medium text-[var(--text-primary)]">{item.title}</div>
                                                    <div className="text-xs text-[var(--text-ghost)]">{item.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Error */}
                        {auditError && (
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-300">Analysis Failed</p>
                                    <p className="text-xs text-red-400/80">{auditError}</p>
                                </div>
                            </div>
                        )}

                        {/* Loading */}
                        {isAnalyzing && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[1, 2, 3].map((i) => (
                                    <Card key={i}>
                                        <CardContent className="p-6 text-center">
                                            <div className="h-10 w-16 mx-auto bg-[var(--bg-raised)] animate-pulse rounded mb-2" />
                                            <div className="h-4 w-20 mx-auto bg-[var(--bg-raised)] animate-pulse rounded" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Real Analysis Results */}
                        {auditResult && !isAnalyzing && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className={cn("text-4xl font-bold mb-2", getScoreColor(auditResult.score))}>
                                                {auditResult.score}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)]">Aelo Score</p>
                                            <Badge variant="outline" className={cn("mt-2 text-xs", getScoreColor(auditResult.score))}>
                                                {getScoreLabel(auditResult.score)}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="text-4xl font-bold text-blue-400 mb-2">
                                                {auditResult.content.wordCount.toLocaleString()}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)]">Word Count</p>
                                            <Badge variant="outline" className={cn(
                                                "mt-2 text-xs",
                                                auditResult.content.wordCount > 1000 ? "text-green-400" :
                                                    auditResult.content.wordCount > 300 ? "text-yellow-400" : "text-red-400"
                                            )}>
                                                {auditResult.content.wordCount > 1000 ? "Comprehensive" :
                                                    auditResult.content.wordCount > 300 ? "Adequate" : "Thin Content"}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="p-6 text-center">
                                            <div className="text-4xl font-bold text-orange-400 mb-2">
                                                {auditResult.content.qnaCount}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)]">Q&A Pairs Found</p>
                                            <Badge variant="outline" className={cn(
                                                "mt-2 text-xs",
                                                auditResult.content.qnaCount > 2 ? "text-green-400" : "text-yellow-400"
                                            )}>
                                                {auditResult.content.qnaCount > 2 ? "Good" : "Add FAQ Section"}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Structure Analysis */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Page Structure</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-[var(--bg-raised)] rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-[var(--text-primary)]">{auditResult.structure.h1Count}</p>
                                                <p className="text-xs text-[var(--text-ghost)]">H1 Tags</p>
                                                {auditResult.structure.h1Count === 1 ? (
                                                    <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto mt-1" />
                                                )}
                                            </div>
                                            <div className="bg-[var(--bg-raised)] rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-[var(--text-primary)]">{auditResult.structure.h2Count}</p>
                                                <p className="text-xs text-[var(--text-ghost)]">H2 Tags</p>
                                                {auditResult.structure.h2Count >= 2 ? (
                                                    <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto mt-1" />
                                                )}
                                            </div>
                                            <div className="bg-[var(--bg-raised)] rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                                    {auditResult.structure.hasSchema ? "Yes" : "No"}
                                                </p>
                                                <p className="text-xs text-[var(--text-ghost)]">Schema Markup</p>
                                                {auditResult.structure.hasSchema ? (
                                                    <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-red-400 mx-auto mt-1" />
                                                )}
                                            </div>
                                            <div className="bg-[var(--bg-raised)] rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-[var(--text-primary)]">
                                                    {auditResult.structure.metaDescription ? "Yes" : "No"}
                                                </p>
                                                <p className="text-xs text-[var(--text-ghost)]">Meta Description</p>
                                                {auditResult.structure.metaDescription ? (
                                                    <CheckCircle className="w-4 h-4 text-green-400 mx-auto mt-1" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-red-400 mx-auto mt-1" />
                                                )}
                                            </div>
                                        </div>
                                        {auditResult.structure.schemaTypes.length > 0 && (
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className="text-xs text-[var(--text-ghost)]">Schema types found:</span>
                                                {auditResult.structure.schemaTypes.map((type, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs text-indigo-400">
                                                        {type}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Issues / Recommendations */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Recommendations</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {auditResult.readability.issues.length > 0 ? (
                                            auditResult.readability.issues.map((issue, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                                                >
                                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-400 mt-0.5" />
                                                    <p className="text-sm text-[var(--text-secondary)]">{issue}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    Great job! No major issues found — your page is well-optimized for AI.
                                                </p>
                                            </div>
                                        )}
                                        <div className="mt-4 p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]">
                                            <p className="text-sm text-[var(--text-secondary)] font-medium">Summary</p>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">{auditResult.summary}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                )}

                {/* Schema Generator */}
                {activeTab === "schema" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Schema Type</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {schemaTypes.map((schema) => (
                                    <button
                                        key={schema.id}
                                        onClick={() => setSelectedSchema(schema.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                                            selectedSchema === schema.id
                                                ? "bg-indigo-500/20 border border-indigo-500/30"
                                                : "bg-[var(--bg-raised)] hover:bg-[var(--bg-raised)] border border-transparent"
                                        )}
                                    >
                                        <span className="text-2xl">{schema.icon}</span>
                                        <div>
                                            <p className="font-medium text-[var(--text-primary)]">{schema.name}</p>
                                            <p className="text-xs text-[var(--text-ghost)]">{schema.description}</p>
                                        </div>
                                    </button>
                                ))}

                                {/* Schema Dynamic Context Form */}
                                <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Brand Name *</label>
                                        <Input
                                            placeholder="e.g. Dylect"
                                            value={schemaBrand}
                                            onChange={(e) => setSchemaBrand(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Brief Description</label>
                                        <Input
                                            placeholder="What is this page about?"
                                            value={schemaDescription}
                                            onChange={(e) => setSchemaDescription(e.target.value)}
                                        />
                                    </div>
                                    {schemaError && (
                                        <p className="text-xs text-red-400 mt-2">{schemaError}</p>
                                    )}
                                </div>

                                <Button
                                    onClick={generateSchema}
                                    className="w-full mt-4"
                                    disabled={isGeneratingSchema || !schemaBrand.trim()}
                                >
                                    {isGeneratingSchema ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                    ) : (
                                        <><Code className="w-4 h-4 mr-2" /> Generate Schema</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Generated Schema</CardTitle>
                                <Button variant="ghost" size="sm" onClick={copySchema} disabled={!generatedSchema}>
                                    {schemaCopied ? (
                                        <><Check className="w-4 h-4 mr-1 text-green-400" /> Copied</>
                                    ) : (
                                        <><Copy className="w-4 h-4 mr-1" /> Copy</>
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-[var(--bg-surface)] p-4 rounded-lg text-sm text-green-400 overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap">
                                    {isGeneratingSchema ? "Generating custom JSON-LD schema..." : (generatedSchema || "Select a schema type and fill out the form to generate dynamic JSON-LD data")}
                                </pre>
                                {generatedSchema && (
                                    <p className="text-xs text-[var(--text-ghost)] mt-3">
                                        💡 Paste this into a {"<script type=\"application/ld+json\">"} tag on your page
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* AI Writer */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                AI Content Writer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Content Type
                                    </label>
                                    <select
                                        className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)]"
                                        value={writerContentType}
                                        onChange={(e) => setWriterContentType(e.target.value)}
                                    >
                                        <option>Blog Post</option>
                                        <option>Product Description</option>
                                        <option>FAQ Section</option>
                                        <option>Landing Page</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                        Target Keyword
                                    </label>
                                    <Input
                                        placeholder="e.g., best tyre inflator"
                                        value={writerTargetKeyword}
                                        onChange={(e) => setWriterTargetKeyword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    Topic / Brief *
                                </label>
                                <textarea
                                    className="w-full h-32 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)]"
                                    placeholder="Describe what you want to write about..."
                                    value={writerTopic}
                                    onChange={(e) => setWriterTopic(e.target.value)}
                                />
                                {writerError && <p className="text-xs text-red-400 mt-2">{writerError}</p>}
                            </div>
                            <Button
                                onClick={handleGenerateContent}
                                disabled={isGeneratingWriter || !writerTopic.trim()}
                            >
                                {isGeneratingWriter ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Zap className="w-4 h-4 mr-2" /> Generate Content</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* AI Writer Result */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg">Generated Draft</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (generatedContent) {
                                        navigator.clipboard.writeText(generatedContent);
                                    }
                                }}
                                disabled={!generatedContent}
                            >
                                <Copy className="w-4 h-4 mr-1" /> Copy Markdown
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 h-[400px] overflow-y-auto w-full prose prose-invert prose-sm max-w-none">
                                {isGeneratingWriter ? (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-ghost)]">
                                        <Sparkles className="w-8 h-8 mb-4 animate-pulse text-indigo-400" />
                                        <p>Our AI is drafting Aelo-optimized content...</p>
                                    </div>
                                ) : generatedContent ? (
                                    <div className="whitespace-pre-wrap">{generatedContent}</div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-ghost)]">
                                        <p>Ready to write.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Technical Audit */}
                {activeTab === "technical" && <TechnicalAudit />}

                {/* Topic Clustering */}
                {activeTab === "clustering" && <TopicClustering />}

                {/* Originality Scorer */}
                {activeTab === "originality" && <OriginalityScorer />}
            </div>
        </>
    );
}
