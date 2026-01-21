"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Package,
    Plus,
    Edit,
    Trash2,
    ChevronRight,
    Tag,
    Users,
    Sparkles,
} from "lucide-react";

const mockProducts = [
    {
        id: 1,
        name: "Tyre Inflator",
        description: "Portable tyre inflators for cars and bikes",
        keywords: ["tyre inflator", "air pump", "car inflator", "portable compressor"],
        competitors: ["Qubo", "Portronics", "Bosch"],
        llmMentions: 45,
        lastScan: "2 hours ago",
    },
    {
        id: 2,
        name: "Pressure Washer",
        description: "High-pressure washers for home and car use",
        keywords: ["pressure washer", "car wash", "high pressure cleaner"],
        competitors: ["Karcher", "Bosch", "Resqtech"],
        llmMentions: 28,
        lastScan: "5 hours ago",
    },
    {
        id: 3,
        name: "Solar Lights",
        description: "Outdoor solar-powered LED lights",
        keywords: ["solar lights", "garden lights", "outdoor LED"],
        competitors: ["Syska", "Philips"],
        llmMentions: 15,
        lastScan: "1 day ago",
    },
];

export default function ProductsPage() {
    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <>
            <Header
                title="Products"
                description="Manage your products and their knowledge base"
            />

            <div className="p-6 space-y-6">
                {/* Add Product Button */}
                <div className="flex justify-end">
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                    </Button>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mockProducts.map((product) => (
                        <Card key={product.id} className="hover:border-zinc-700 transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-violet-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{product.name}</CardTitle>
                                            <p className="text-xs text-zinc-500">{product.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Keywords */}
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                                        <Tag className="w-3 h-3" />
                                        Keywords
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {product.keywords.slice(0, 3).map((kw, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                                {kw}
                                            </Badge>
                                        ))}
                                        {product.keywords.length > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{product.keywords.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Competitors */}
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                                        <Users className="w-3 h-3" />
                                        Competitors
                                    </div>
                                    <p className="text-sm text-zinc-300">
                                        {product.competitors.join(", ")}
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-violet-400" />
                                        <span className="text-sm text-zinc-300">
                                            {product.llmMentions} LLM mentions
                                        </span>
                                    </div>
                                    <span className="text-xs text-zinc-500">
                                        Scanned {product.lastScan}
                                    </span>
                                </div>

                                <Button variant="outline" className="w-full">
                                    View Details
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Add New Product Card */}
                    <Card
                        className="border-dashed hover:border-zinc-600 transition-colors cursor-pointer"
                        onClick={() => setShowAddModal(true)}
                    >
                        <CardContent className="h-full flex flex-col items-center justify-center py-12 text-zinc-500 hover:text-zinc-300">
                            <Plus className="w-12 h-12 mb-3" />
                            <p className="font-medium">Add New Product</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
