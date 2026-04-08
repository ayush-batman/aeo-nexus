"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
    Loader2, Plus, Trash2, Search, Save, Lightbulb, Sparkles,
    ArrowRight, Bookmark, Copy, Check, ExternalLink, ClipboardList,
    Info, Zap, Compass, Globe, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Prompt } from "@/lib/data-access";
import { useRouter } from "next/navigation";
import {
    PROMPT_TEMPLATES, CATEGORY_META, fillTemplate,
    getAllCategories, getTemplatesByCategory,
    type PromptCategory,
} from "@/lib/prompts/manual-check-templates";

interface GeneratedPrompt {
    category: string;
    prompt: string;
}

const LLM_LINKS = [
    { name: 'ChatGPT', url: 'https://chat.openai.com', color: 'bg-green-500' },
    { name: 'Gemini', url: 'https://gemini.google.com', color: 'bg-blue-500' },
    { name: 'Perplexity', url: 'https://perplexity.ai', color: 'bg-purple-500' },
    { name: 'Claude', url: 'https://claude.ai', color: 'bg-orange-500' },
];

export default function PromptResearchPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("quick-check");
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Brand/workspace context
    const [brandName, setBrandName] = useState("");
    const [industry, setIndustry] = useState("");
    const [audience, setAudience] = useState("");

    // Generator State
    const [topic, setTopic] = useState("");
    const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);

    // Library State
    const [savedPrompts, setSavedPrompts] = useState<Prompt[]>([]);
    const [savingId, setSavingId] = useState<string | null>(null);

    // Copy state
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Quick Check filter
    const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'all'>('all');

    // Discovery state
    const [discoverQuery, setDiscoverQuery] = useState("");
    const [discovering, setDiscovering] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState<{
        autocomplete: string[];
        peopleAlsoAsk: string[];
        relatedQueries: string[];
    } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('org_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const [wsRes, activeRes] = await Promise.all([
                        fetch("/api/workspaces", { cache: "no-store" }),
                        fetch("/api/onboarding/context", { cache: "no-store" })
                    ]);
                    let activeId = null;
                    if (activeRes.ok) activeId = (await activeRes.json()).workspaceId;
                    if (wsRes.ok && activeId) {
                        const wsData = await wsRes.json();
                        const workspace = wsData.workspaces?.find((ws: any) => ws.id === activeId);

                        if (workspace) {
                            setBrandName(workspace.name || '');
                            setIndustry(workspace.settings?.industry || '');
                            setAudience(workspace.settings?.target_audience || '');
                            if (!topic) setTopic(workspace.settings?.industry || '');
                            fetchLibrary();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchLibrary() {
        try {
            const res = await fetch('/api/prompts/library');
            if (res.ok) {
                const data = await res.json();
                setSavedPrompts(data);
            }
        } catch (error) {
            console.error('Error fetching library:', error);
        }
    }

    async function handleGenerate() {
        if (!topic.trim()) return;
        setGenerating(true);
        setGeneratedPrompts([]);

        try {
            const res = await fetch('/api/prompts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, brand: brandName, industry, audience }),
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedPrompts(data);
            }
        } catch (error) {
            console.error('Error generating prompts:', error);
        } finally {
            setGenerating(false);
        }
    }

    async function handleSave(p: GeneratedPrompt) {
        setSavingId(p.prompt);
        try {
            const res = await fetch('/api/prompts/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: p.prompt,
                    category: p.category,
                    is_favorite: false,
                    ai_generated: true
                }),
            });

            if (res.ok) {
                const newPrompt = await res.json();
                setSavedPrompts([newPrompt, ...savedPrompts]);
            }
        } catch (error) {
            console.error('Error saving prompt:', error);
        } finally {
            setSavingId(null);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this prompt?")) return;

        try {
            const res = await fetch(`/api/prompts/library/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSavedPrompts(savedPrompts.filter(p => p.id !== id));
            }
        } catch (error) {
            console.error('Error deleting prompt:', error);
        }
    }

    function handleScan(promptText: string) {
        router.push(`/dashboard/llm-tracker?prompt=${encodeURIComponent(promptText)}`);
    }

    function handleCopy(id: string, text: string) {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    const isSaved = (text: string) => savedPrompts.some(p => p.prompt === text);

    // Prompt discovery
    const handleDiscover = async () => {
        if (!discoverQuery.trim()) return;
        setDiscovering(true);
        setDiscoveryResults(null);
        try {
            const res = await fetch('/api/prompts/discover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: discoverQuery,
                    brandName,
                    industry,
                }),
            });
            if (!res.ok) throw new Error('Discovery failed');
            const data = await res.json();
            setDiscoveryResults(data);
        } catch (err) {
            console.error('Discovery error:', err);
        } finally {
            setDiscovering(false);
        }
    };

    const handleSaveDiscovered = async (promptText: string) => {
        await handleSave({ category: 'discovered', prompt: promptText });
    };

    // Get filled templates
    const variables = { brand: brandName, industry, audience };
    const filledTemplates = PROMPT_TEMPLATES.map(t => ({
        ...t,
        filledPrompt: fillTemplate(t.prompt, variables),
    }));

    const filteredTemplates = selectedCategory === 'all'
        ? filledTemplates
        : filledTemplates.filter(t => t.category === selectedCategory);

    return (
        <>
            <Header
                title="Prompt Research"
                description="Discover & test the prompts your customers ask AI about your brand."
            />

            <div className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-[var(--bg-raised)] border-[var(--border-default)]">
                        <TabsTrigger value="quick-check" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Quick Check
                        </TabsTrigger>
                        <TabsTrigger value="discover" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                            <Sparkles className="w-4 h-4 mr-2" />
                            AI Generator
                        </TabsTrigger>
                        <TabsTrigger value="library" className="data-[state=active]:bg-[var(--bg-raised)] data-[state=active]:text-[var(--text-primary)]">
                            <Bookmark className="w-4 h-4 mr-2" />
                            Saved Library
                            {savedPrompts.length > 0 && (
                                <span className="ml-2 text-xs bg-[var(--bg-base)] px-1.5 py-0.5 rounded-full text-[var(--text-secondary)]">
                                    {savedPrompts.length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="prompt-discovery" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                            <Compass className="w-4 h-4 mr-2" />
                            Discover
                        </TabsTrigger>
                    </TabsList>

                    {/* ===== QUICK CHECK TAB ===== */}
                    <TabsContent value="quick-check" className="space-y-6">
                        {/* How-to Guide Card */}
                        <Card className="border-indigo-500/20 bg-gradient-to-br from-violet-950/30 to-zinc-900">
                            <CardContent className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Zap className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-[var(--text-primary)] mb-1">Manual LLM Check — How It Works</h3>
                                        <p className="text-sm text-[var(--text-secondary)] mb-3">
                                            Copy any prompt below and paste it into ChatGPT, Gemini, Perplexity, or Claude.
                                            Check if your brand appears in the response, at what position, and with what sentiment.
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {LLM_LINKS.map(llm => (
                                                <a
                                                    key={llm.name}
                                                    href={llm.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-raised)]/80 hover:bg-[var(--bg-raised)] transition-colors text-sm text-[var(--text-secondary)]"
                                                >
                                                    <div className={cn("w-2 h-2 rounded-full", llm.color)} />
                                                    {llm.name}
                                                    <ExternalLink className="w-3 h-3 text-[var(--text-ghost)]" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Brand context (inline editable) */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-ghost)] mb-1">Your Brand</label>
                                        <Input
                                            value={brandName}
                                            onChange={e => setBrandName(e.target.value)}
                                            placeholder="e.g. Dylect"
                                            className="bg-[var(--bg-base)]/50 h-9"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-ghost)] mb-1">Industry / Category</label>
                                        <Input
                                            value={industry}
                                            onChange={e => setIndustry(e.target.value)}
                                            placeholder="e.g. dashcam, CRM, SaaS"
                                            className="bg-[var(--bg-base)]/50 h-9"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-ghost)] mb-1">Target Audience</label>
                                        <Input
                                            value={audience}
                                            onChange={e => setAudience(e.target.value)}
                                            placeholder="e.g. car owners, small businesses"
                                            className="bg-[var(--bg-base)]/50 h-9"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Category filters */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm transition-all",
                                    selectedCategory === 'all'
                                        ? "bg-indigo-500 text-white"
                                        : "bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:bg-[var(--bg-raised)]"
                                )}
                            >
                                All ({filledTemplates.length})
                            </button>
                            {getAllCategories().map(cat => {
                                const meta = CATEGORY_META[cat];
                                const count = filledTemplates.filter(t => t.category === cat).length;
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm transition-all",
                                            selectedCategory === cat
                                                ? "bg-[var(--bg-raised)] text-[var(--text-primary)] border border-zinc-500"
                                                : "bg-[var(--bg-raised)] text-[var(--text-ghost)] hover:bg-[var(--bg-raised)] hover:text-[var(--text-secondary)]"
                                        )}
                                    >
                                        {meta.icon} {meta.label} ({count})
                                    </button>
                                );
                            })}
                        </div>

                        {/* Prompt cards */}
                        <div className="grid gap-3">
                            {filteredTemplates.map(template => (
                                <div
                                    key={template.id}
                                    className="group p-4 rounded-xl bg-[var(--bg-raised)]/40 border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Badge variant="outline" className={cn("text-xs border-[var(--border-default)]", CATEGORY_META[template.category].color)}>
                                                    {CATEGORY_META[template.category].icon} {CATEGORY_META[template.category].label}
                                                </Badge>
                                                <span className="text-xs text-[var(--text-ghost)]">{template.title}</span>
                                            </div>
                                            <p className="text-[var(--text-primary)] font-medium text-[15px] leading-relaxed">
                                                {template.filledPrompt}
                                            </p>
                                            <p className="text-xs text-[var(--text-ghost)] mt-1.5">{template.description}</p>
                                            {template.llmTip && (
                                                <p className="text-xs text-indigo-400/70 mt-1 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    {template.llmTip}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(template.id, template.filledPrompt)}
                                                className={cn(
                                                    "h-8 text-xs transition-all",
                                                    copiedId === template.id
                                                        ? "border-green-500 text-green-400"
                                                        : "border-[var(--border-default)] text-[var(--text-secondary)] hover:text-white"
                                                )}
                                            >
                                                {copiedId === template.id ? (
                                                    <><Check className="w-3 h-3 mr-1" /> Copied!</>
                                                ) : (
                                                    <><Copy className="w-3 h-3 mr-1" /> Copy</>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleScan(template.filledPrompt)}
                                                className="h-8 text-xs bg-indigo-500 hover:bg-violet-700 text-white"
                                            >
                                                <Search className="w-3 h-3 mr-1" /> Test on LLM
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* ===== AI GENERATOR TAB ===== */}
                    <TabsContent value="discover" className="space-y-6">
                        <Card className="border-indigo-500/20 bg-gradient-to-br from-zinc-900 to-zinc-900/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                                    Generate Research Prompts
                                </CardTitle>
                                <CardDescription>
                                    Use AI to simulate your customer's journey and find the questions they ask at each stage.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Topic / Product Category</label>
                                        <Input
                                            placeholder="e.g. CRM Software, Running Shoes, Vegan Protein"
                                            value={topic}
                                            onChange={e => setTopic(e.target.value)}
                                            className="bg-[var(--bg-base)]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Your Brand Name</label>
                                        <Input
                                            placeholder="e.g. Acme Corp"
                                            value={brandName}
                                            onChange={e => setBrandName(e.target.value)}
                                            className="bg-[var(--bg-base)]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Target Audience</label>
                                        <Input
                                            placeholder="e.g. small business owners"
                                            value={audience}
                                            onChange={e => setAudience(e.target.value)}
                                            className="bg-[var(--bg-base)]/50"
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!topic || generating}
                                    className="w-full md:w-auto bg-indigo-500 hover:bg-violet-700 text-white"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Analyzing Buyer Journey...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Generate Prompts
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {generatedPrompts.length > 0 && (
                            <div className="grid gap-4">
                                {['Awareness', 'Consideration', 'Comparison', 'Decision', 'Commercial'].map(category => {
                                    const promptsInCategory = generatedPrompts.filter(p => p.category === category);
                                    if (promptsInCategory.length === 0) return null;

                                    return (
                                        <Card key={category}>
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                                    {category} Stage
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {promptsInCategory.map((p, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)] hover:bg-[var(--bg-raised)] transition-colors group">
                                                        <p className="text-[var(--text-primary)] font-medium">{p.prompt}</p>
                                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCopy(`gen-${i}`, p.prompt)}
                                                                className="text-[var(--text-secondary)] hover:text-white"
                                                            >
                                                                {copiedId === `gen-${i}` ? (
                                                                    <span className="flex items-center text-xs text-green-400"><Check className="w-3 h-3 mr-1" /> Copied</span>
                                                                ) : (
                                                                    <span className="flex items-center text-xs"><Copy className="w-3 h-3 mr-1" /> Copy</span>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleSave(p)}
                                                                disabled={isSaved(p.prompt) || savingId === p.prompt}
                                                                className={cn(isSaved(p.prompt) ? "text-green-400" : "text-[var(--text-secondary)] hover:text-white")}
                                                            >
                                                                {savingId === p.prompt ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : isSaved(p.prompt) ? (
                                                                    <span className="flex items-center text-xs"><Save className="w-3 h-3 mr-1" /> Saved</span>
                                                                ) : (
                                                                    <span className="flex items-center text-xs"><Plus className="w-3 h-3 mr-1" /> Save</span>
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleScan(p.prompt)}
                                                                className="text-indigo-400 hover:text-indigo-300"
                                                            >
                                                                <Search className="w-3 h-3 mr-1" />
                                                                Scan
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* ===== SAVED LIBRARY TAB ===== */}
                    <TabsContent value="library" className="space-y-4">
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : savedPrompts.length === 0 ? (
                            <div className="text-center py-12 text-[var(--text-ghost)] bg-[var(--bg-raised)]/30 rounded-lg border border-[var(--border-default)] border-dashed">
                                <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No saved prompts yet</h3>
                                <p className="mb-6 max-w-sm mx-auto">Generate prompts in the AI Generator tab to build your research library.</p>
                                <Button onClick={() => setActiveTab("discover")} variant="outline">
                                    Go to AI Generator
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {savedPrompts.map(prompt => (
                                    <div key={prompt.id} className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)] hover:border-zinc-500 transition-colors">
                                        <div className="flex-1 min-w-0 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="outline" className="text-xs border-[var(--border-hover)] text-[var(--text-secondary)]">
                                                    {prompt.category}
                                                </Badge>
                                                <span className="text-xs text-[var(--text-ghost)]">
                                                    {new Date(prompt.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="font-medium text-[var(--text-primary)] text-lg">{prompt.prompt}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(`lib-${prompt.id}`, prompt.prompt)}
                                                className="text-[var(--text-secondary)] border-[var(--border-default)]"
                                            >
                                                {copiedId === `lib-${prompt.id}` ? (
                                                    <><Check className="w-3 h-3 mr-1" /> Copied</>
                                                ) : (
                                                    <><Copy className="w-3 h-3 mr-1" /> Copy</>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => handleScan(prompt.prompt)}
                                                className="bg-indigo-500 hover:bg-violet-700 text-white"
                                                size="sm"
                                            >
                                                <Search className="w-4 h-4 mr-2" />
                                                Scan Now
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(prompt.id)}
                                                className="text-[var(--text-ghost)] hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* ===== PROMPT DISCOVERY TAB ===== */}
                    <TabsContent value="prompt-discovery" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Compass className="w-5 h-5 text-indigo-400" />
                                    Discover Real Prompts
                                </CardTitle>
                                <CardDescription>
                                    Find actual search queries, People Also Ask questions, and comparison prompts your audience uses.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter a seed keyword (e.g., 'tyre inflator', 'CRM software', 'best headphones')"
                                        value={discoverQuery}
                                        onChange={(e) => setDiscoverQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleDiscover()}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleDiscover}
                                        disabled={discovering || !discoverQuery.trim()}
                                    >
                                        {discovering ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Discovering...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4 mr-2" />
                                                Discover
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {discoveryResults && (
                                    <div className="space-y-6 mt-4">
                                        {/* Autocomplete Suggestions */}
                                        {discoveryResults.autocomplete.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-blue-400" />
                                                    Google Autocomplete ({discoveryResults.autocomplete.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {discoveryResults.autocomplete.map((suggestion, i) => (
                                                        <div
                                                            key={`ac-${i}`}
                                                            className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]"
                                                        >
                                                            <p className="text-sm text-[var(--text-primary)] flex-1">{suggestion}</p>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                {isSaved(suggestion) ? (
                                                                    <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">Saved</Badge>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleSaveDiscovered(suggestion)}
                                                                        className="text-[var(--text-secondary)] hover:text-indigo-400 text-xs"
                                                                    >
                                                                        <Bookmark className="w-3 h-3 mr-1" />
                                                                        Save
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleScan(suggestion)}
                                                                    className="text-[var(--text-secondary)] hover:text-blue-400 text-xs"
                                                                >
                                                                    <Search className="w-3 h-3 mr-1" />
                                                                    Scan
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* People Also Ask */}
                                        {discoveryResults.peopleAlsoAsk.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <Lightbulb className="w-4 h-4 text-amber-400" />
                                                    People Also Ask ({discoveryResults.peopleAlsoAsk.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {discoveryResults.peopleAlsoAsk.map((question, i) => (
                                                        <div
                                                            key={`paa-${i}`}
                                                            className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                                                        >
                                                            <p className="text-sm text-[var(--text-primary)] flex-1">{question}</p>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                {isSaved(question) ? (
                                                                    <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">Saved</Badge>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleSaveDiscovered(question)}
                                                                        className="text-[var(--text-secondary)] hover:text-indigo-400 text-xs"
                                                                    >
                                                                        <Bookmark className="w-3 h-3 mr-1" />
                                                                        Save
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleScan(question)}
                                                                    className="text-[var(--text-secondary)] hover:text-blue-400 text-xs"
                                                                >
                                                                    <Search className="w-3 h-3 mr-1" />
                                                                    Scan
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Related Queries */}
                                        {discoveryResults.relatedQueries.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                                    Related Comparisons ({discoveryResults.relatedQueries.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {discoveryResults.relatedQueries.map((query, i) => (
                                                        <div
                                                            key={`rq-${i}`}
                                                            className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/10"
                                                        >
                                                            <p className="text-sm text-[var(--text-primary)] flex-1">{query}</p>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                {isSaved(query) ? (
                                                                    <Badge variant="outline" className="text-xs text-green-400 border-green-500/30">Saved</Badge>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleSaveDiscovered(query)}
                                                                        className="text-[var(--text-secondary)] hover:text-indigo-400 text-xs"
                                                                    >
                                                                        <Bookmark className="w-3 h-3 mr-1" />
                                                                        Save
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleScan(query)}
                                                                    className="text-[var(--text-secondary)] hover:text-blue-400 text-xs"
                                                                >
                                                                    <Search className="w-3 h-3 mr-1" />
                                                                    Scan
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {discoveryResults.autocomplete.length === 0 &&
                                            discoveryResults.peopleAlsoAsk.length === 0 &&
                                            discoveryResults.relatedQueries.length === 0 && (
                                                <div className="text-center py-8 text-[var(--text-ghost)]">
                                                    <p>No results found. Try a different keyword.</p>
                                                </div>
                                            )}
                                    </div>
                                )}

                                {!discoveryResults && !discovering && (
                                    <div className="text-center py-12 text-[var(--text-ghost)]">
                                        <Compass className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm">Enter a keyword above to discover real prompts your audience searches for</p>
                                        <p className="text-xs mt-1 text-zinc-700">Powered by Google Autocomplete + AI-generated People Also Ask</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div >
        </>
    );
}
