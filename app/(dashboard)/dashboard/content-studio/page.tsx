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
} from "lucide-react";

const schemaTypes = [
    { id: "faq", name: "FAQ", icon: "❓", description: "Frequently Asked Questions" },
    { id: "product", name: "Product", icon: "📦", description: "Product information" },
    { id: "howto", name: "HowTo", icon: "📝", description: "Step-by-step guides" },
    { id: "article", name: "Article", icon: "📰", description: "News/Blog articles" },
    { id: "localbusiness", name: "Local Business", icon: "🏪", description: "Business info" },
];

// Mock content analysis results
const mockAnalysis = {
    url: "https://dylect.com/products/tyre-inflator",
    aeoScore: 72,
    readabilityScore: 85,
    eeatScore: 68,
    schemaPresent: ["Product", "BreadcrumbList"],
    recommendations: [
        { type: "high", text: "Add FAQ schema for common questions" },
        { type: "medium", text: "Include more E-E-A-T signals (author, credentials)" },
        { type: "low", text: "Optimize meta description for AI extraction" },
    ],
};

export default function ContentStudioPage() {
    const [activeTab, setActiveTab] = useState<"analyzer" | "schema" | "writer">("analyzer");
    const [url, setUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedSchema, setSelectedSchema] = useState("faq");
    const [generatedSchema, setGeneratedSchema] = useState("");

    const handleAnalyze = async () => {
        if (!url.trim()) return;
        setIsAnalyzing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsAnalyzing(false);
    };

    const generateSchema = () => {
        const schemas: Record<string, string> = {
            faq: `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is the best tyre inflator?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "The Dylect Turbo Max 600 is highly rated..."
    }
  }]
}`,
            product: `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Dylect Turbo Max 600",
  "description": "Portable tyre inflator with digital display",
  "brand": { "@type": "Brand", "name": "Dylect" },
  "offers": {
    "@type": "Offer",
    "price": "2999",
    "priceCurrency": "INR"
  }
}`,
            howto: `{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Use a Tyre Inflator",
  "step": [{
    "@type": "HowToStep",
    "name": "Connect to tyre",
    "text": "Attach the nozzle to the tyre valve..."
  }]
}`,
        };
        setGeneratedSchema(schemas[selectedSchema] || schemas.faq);
    };

    return (
        <>
            <Header
                title="Content Studio"
                description="Optimize your content for AI citations"
            />

            <div className="p-6 space-y-6">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-zinc-800 pb-4">
                    {[
                        { id: "analyzer", label: "Content Analyzer", icon: Search },
                        { id: "schema", label: "Schema Generator", icon: Code },
                        { id: "writer", label: "AI Writer", icon: Sparkles },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
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
                                <CardTitle className="text-lg">Analyze URL</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter URL to analyze (e.g., https://yoursite.com/page)"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                                        {isAnalyzing ? "Analyzing..." : "Analyze"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Analysis Results */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="text-4xl font-bold text-violet-400 mb-2">
                                        {mockAnalysis.aeoScore}
                                    </div>
                                    <p className="text-sm text-zinc-400">AEO Score</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="text-4xl font-bold text-green-400 mb-2">
                                        {mockAnalysis.readabilityScore}
                                    </div>
                                    <p className="text-sm text-zinc-400">Readability</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6 text-center">
                                    <div className="text-4xl font-bold text-orange-400 mb-2">
                                        {mockAnalysis.eeatScore}
                                    </div>
                                    <p className="text-sm text-zinc-400">E-E-A-T Score</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {mockAnalysis.recommendations.map((rec, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg",
                                            rec.type === "high" && "bg-red-500/10 border border-red-500/20",
                                            rec.type === "medium" && "bg-yellow-500/10 border border-yellow-500/20",
                                            rec.type === "low" && "bg-blue-500/10 border border-blue-500/20"
                                        )}
                                    >
                                        <AlertCircle className={cn(
                                            "w-5 h-5 flex-shrink-0",
                                            rec.type === "high" && "text-red-400",
                                            rec.type === "medium" && "text-yellow-400",
                                            rec.type === "low" && "text-blue-400"
                                        )} />
                                        <p className="text-sm text-zinc-300">{rec.text}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
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
                                                ? "bg-violet-600/20 border border-violet-500/30"
                                                : "bg-zinc-800/50 hover:bg-zinc-800 border border-transparent"
                                        )}
                                    >
                                        <span className="text-2xl">{schema.icon}</span>
                                        <div>
                                            <p className="font-medium text-zinc-200">{schema.name}</p>
                                            <p className="text-xs text-zinc-500">{schema.description}</p>
                                        </div>
                                    </button>
                                ))}
                                <Button onClick={generateSchema} className="w-full mt-4">
                                    <Code className="w-4 h-4 mr-2" />
                                    Generate Schema
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Generated Schema</CardTitle>
                                <Button variant="ghost" size="sm">
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-zinc-900 p-4 rounded-lg text-sm text-green-400 overflow-x-auto">
                                    {generatedSchema || "Select a schema type and click generate"}
                                </pre>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* AI Writer */}
                {activeTab === "writer" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-400" />
                                AI Content Writer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Content Type
                                    </label>
                                    <select className="w-full h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100">
                                        <option>Blog Post</option>
                                        <option>Product Description</option>
                                        <option>FAQ Section</option>
                                        <option>Landing Page</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                                        Target Keyword
                                    </label>
                                    <Input placeholder="e.g., best tyre inflator" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-300 mb-2">
                                    Topic / Brief
                                </label>
                                <textarea
                                    className="w-full h-32 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                                    placeholder="Describe what you want to write about..."
                                />
                            </div>
                            <Button>
                                <Zap className="w-4 h-4 mr-2" />
                                Generate Content
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
