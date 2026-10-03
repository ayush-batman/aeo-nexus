"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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
    const [name, setName] = useState(productToEdit?.name ?? "");
    const [description, setDescription] = useState(productToEdit?.description ?? "");
    const [website, setWebsite] = useState(productToEdit?.website ?? "");
    const [keywordsStr, setKeywordsStr] = useState((productToEdit?.keywords ?? []).join(", "));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError("Product name is required");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
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

            const response = await fetch('/api/products', { method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...productData, ...(productToEdit ? { id: productToEdit.id } : {}) }) });
            if (!response.ok) throw new Error((await response.json()).error || 'Unable to save product.');

            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Error saving product:", err);
            setError(err instanceof Error ? err.message : "Failed to save product");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto p-0">
                <DialogHeader className="border-b border-[var(--border-default)] p-4 pr-16 text-left">
                    <DialogTitle className="text-lg">
                        {productToEdit ? "Edit Product" : "Add New Product"}
                    </DialogTitle>
                    <DialogDescription>Add the product context Aelo should use when finding relevant discussions.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div role="alert" className="p-3 rounded-lg bg-[var(--data-red)]/10 border border-[var(--data-red)]/25 text-[var(--data-red)] text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[var(--text-secondary)]">Product Name <span className="text-[var(--data-red)]">*</span></Label>
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
            </DialogContent>
        </Dialog>
    );
}
