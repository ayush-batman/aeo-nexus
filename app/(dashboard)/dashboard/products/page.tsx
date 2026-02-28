"use client";

import { useState, useEffect } from "react";
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
    Globe,
    Sparkles,
    Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AddProductModal } from "@/components/dashboard/products/add-product-modal";

interface Product {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    keywords: string[];
    workspace_id: string;
    created_at: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        try {
            const res = await fetch("/api/onboarding/context");
            const ctx = await res.json();
            if (!ctx?.workspaceId) return;

            setWorkspaceId(ctx.workspaceId);

            const supabase = createClient();
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("workspace_id", ctx.workspaceId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching products:", error);
                return;
            }

            setProducts(data || []);
        } catch (err) {
            console.error("Failed to load products:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(productId: string) {
        if (!confirm("Are you sure you want to delete this product?")) return;

        setIsDeleting(productId);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", productId);

            if (error) throw error;

            setProducts(products.filter(p => p.id !== productId));
        } catch (err) {
            console.error("Failed to delete product:", err);
            alert("Failed to delete product");
        } finally {
            setIsDeleting(null);
        }
    }

    const handleOpenEdit = (product: Product) => {
        setProductToEdit(product);
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setTimeout(() => setProductToEdit(null), 200); // Slight delay for exit animation
    };

    if (loading) {
        return (
            <>
                <Header
                    title="Products"
                    description="Manage your products and their knowledge base"
                />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
            </>
        );
    }

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
                    {products.map((product) => (
                        <Card key={product.id} className="hover:border-[var(--border)] transition-colors">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <Package className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{product.name}</CardTitle>
                                            <p className="text-xs text-[var(--text-ghost)]">{product.description || "No description"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleOpenEdit(product)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-300"
                                            onClick={() => handleDelete(product.id)}
                                            disabled={isDeleting === product.id}
                                        >
                                            {isDeleting === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Website */}
                                {product.website && (
                                    <div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
                                            <Globe className="w-3 h-3" />
                                            Website
                                        </div>
                                        <a
                                            href={product.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-indigo-400 hover:text-indigo-300 truncate block"
                                        >
                                            {product.website}
                                        </a>
                                    </div>
                                )}

                                {/* Keywords */}
                                {product.keywords && product.keywords.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                                            <Tag className="w-3 h-3" />
                                            Keywords
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {product.keywords.slice(0, 4).map((kw, i) => (
                                                <Badge key={i} variant="outline" className="text-xs">
                                                    {kw}
                                                </Badge>
                                            ))}
                                            {product.keywords.length > 4 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{product.keywords.length - 4}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                        <span className="text-sm text-[var(--text-secondary)]">
                                            Added {new Date(product.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <Button variant="outline" className="w-full">
                                    View Details
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}

                    {/* Empty State */}
                    {products.length === 0 && (
                        <Card className="col-span-full border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-[var(--text-ghost)]">
                                <Package className="w-12 h-12 mb-3" />
                                <p className="font-medium mb-1">No products yet</p>
                                <p className="text-sm text-[var(--text-ghost)]">Add your first product to start tracking</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Add New Product Card */}
                    <Card
                        className="border-dashed hover:border-[var(--border-hover)] transition-colors cursor-pointer"
                        onClick={() => setShowAddModal(true)}
                    >
                        <CardContent className="h-full flex flex-col items-center justify-center py-12 text-[var(--text-ghost)] hover:text-[var(--text-secondary)]">
                            <Plus className="w-12 h-12 mb-3" />
                            <p className="font-medium">Add New Product</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            {workspaceId && (
                <AddProductModal
                    isOpen={showAddModal}
                    onClose={handleCloseModal}
                    onSuccess={fetchProducts}
                    productToEdit={productToEdit}
                    workspaceId={workspaceId}
                />
            )}
        </>
    );
}
