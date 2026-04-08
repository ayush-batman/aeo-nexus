"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    platformsMap: { id: string; name: string; color?: string }[];
}

export function AddScheduleModal({ isOpen, onClose, onSuccess, platformsMap }: AddScheduleModalProps) {
    const [prompt, setPrompt] = useState("");
    const [frequency, setFrequency] = useState("daily");
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const togglePlatform = (id: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || selectedPlatforms.length === 0) {
            setError("Prompt and at least one platform are required.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/llm/scheduled", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt,
                    platforms: selectedPlatforms,
                    frequency
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create schedule");
            }

            onSuccess();
            onClose();
            // Reset state
            setPrompt("");
            setSelectedPlatforms([]);
            setFrequency("daily");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-primary)]">
                <DialogHeader>
                    <DialogTitle>Add Automated Scan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="prompt" className="text-[var(--text-secondary)] text-xs">Prompt to Track</Label>
                        <Input
                            id="prompt"
                            placeholder="e.g. Best CRM software for small business"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="bg-[var(--bg-surface)] border-[var(--border-default)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[var(--text-secondary)] text-xs">Platforms</Label>
                        <div className="flex flex-wrap gap-2">
                            {platformsMap.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => togglePlatform(p.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                                        selectedPlatforms.includes(p.id)
                                            ? "bg-[var(--bg-raised)] text-[var(--text-primary)] border border-[var(--border-hover)]"
                                            : "bg-[var(--bg-raised)] text-[var(--text-ghost)] border border-transparent hover:border-[var(--border-default)]"
                                    )}
                                >
                                    <div className={cn("w-2 h-2 rounded-full", p.color)} />
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="frequency" className="text-[var(--text-secondary)] text-xs">Frequency</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger className="bg-[var(--bg-surface)] border-[var(--border-default)]">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--text-primary)]">
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 pb-2 pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)]">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-indigo-500 hover:bg-violet-700 text-white">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Schedule"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
