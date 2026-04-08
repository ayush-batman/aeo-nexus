"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Product {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    keywords: string[];
    workspace_id: string;
    created_at: string;
}

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Product | null;
    workspaceId: string;
}

export function AddProductModal({ isOpen, onClose, onSuccess, productToEdit, workspaceId }: AddProductModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [website, setWebsite] = useState("");
    const [keywordsStr, setKeywordsStr] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setName(productToEdit.name);
                setDescription(productToEdit.description || "");
                setWebsite(productToEdit.website || "");
                setKeywordsStr((productToEdit.keywords || []).join(", "));
            } else {
                setName("");
                setDescription("");
                setWebsite("");
                setKeywordsStr("");
            }
            setError(null);
        }
    }, [isOpen, productToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Product name is required");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const supabase = createClient();

            const keywordsArray = keywordsStr
                .split(",")
                .map(k => k.trim())
                .filter(k => k.length > 0);

            const productData = {
                name: name.trim(),
                description: description.trim() || null,
                website: website.trim() || null,
                keywords: keywordsArray,
                workspace_id: workspaceId,
            };

            let err;

            if (productToEdit) {
                const { error } = await supabase
                    .from("products")
                    .update(productData)
                    .eq("id", productToEdit.id);
                err = error;
            } else {
                const { error } = await supabase
                    .from("products")
                    .insert(productData);
                err = error;
            }

            if (err) throw new Error(err.message);

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error saving product:", err);
            setError(err.message || "Failed to save product");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {productToEdit ? "Edit Product" : "Add New Product"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[var(--text-secondary)]">Product Name <span className="text-red-400">*</span></Label>
                        <Input
                            id="name"
                            placeholder="e.g. Aelo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-[var(--bg-base)] border-[var(--border-default)]"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-[var(--text-secondary)]">Description</Label>
                        <Input
                            id="description"
                            placeholder="Short description of what it does"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-[var(--bg-base)] border-[var(--border-default)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="website" className="text-[var(--text-secondary)]">Website URL</Label>
                        <Input
                            id="website"
                            type="url"
                            placeholder="https://example.com"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="bg-[var(--bg-base)] border-[var(--border-default)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="keywords" className="text-[var(--text-secondary)]">Keywords (Comma separated)</Label>
                        <Input
                            id="keywords"
                            placeholder="e.g. CRM, Sales, B2B"
                            value={keywordsStr}
                            onChange={(e) => setKeywordsStr(e.target.value)}
                            className="bg-[var(--bg-base)] border-[var(--border-default)]"
                        />
                        <p className="text-xs text-[var(--text-ghost)]">These help the AI identify relevant discussions.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !name.trim()}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {productToEdit ? "Save Changes" : "Add Product"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
