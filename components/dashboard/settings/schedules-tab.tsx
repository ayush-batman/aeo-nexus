"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Calendar, Plus, Trash2, Play, RefreshCw, Clock, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduledScan } from "@/lib/data-access";

interface SchedulesTabProps {
    workspaceId: string;
}

export function SchedulesTab({ workspaceId }: SchedulesTabProps) {
    const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // New Schedule Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [platforms, setPlatforms] = useState<string[]>(['gemini']);

    const API_PLATFORMS = ['gemini', 'chatgpt', 'claude', 'perplexity'];

    useEffect(() => {
        fetchSchedules();
    }, []);

    async function fetchSchedules() {
        try {
            const res = await fetch('/api/llm/schedules');
            if (res.ok) {
                const data = await res.json();
                setSchedules(data);
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!prompt.trim()) return;
        setCreating(true);

        try {
            const res = await fetch('/api/llm/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    frequency,
                    platforms,
                    competitors: [] // Use workspace default or add input later
                }),
            });

            if (res.ok) {
                const newSchedule = await res.json();
                setSchedules([newSchedule, ...schedules]);
                setIsFormOpen(false);
                setPrompt("");
                setPlatforms(['gemini']);
                setFrequency('daily');
            }
        } catch (error) {
            console.error('Error creating schedule:', error);
        } finally {
            setCreating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this schedule?")) return;

        try {
            const res = await fetch(`/api/llm/schedules/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSchedules(schedules.filter(s => s.id !== id));
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
        }
    }

    const togglePlatform = (p: string) => {
        setPlatforms(prev =>
            prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
        );
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        Scheduled Scans
                    </CardTitle>
                    {!isFormOpen && (
                        <Button onClick={() => setIsFormOpen(true)} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            New Schedule
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isFormOpen && (
                        <div className="mb-6 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium text-[var(--text-primary)]">Create New Schedule</h3>
                                <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="h-6 w-6">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Search Prompt</label>
                                    <Input
                                        placeholder="e.g. Best CRM software for small business"
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Frequency</label>
                                        <div className="flex bg-[var(--surface)] rounded-md p-1 border border-[var(--border)]">
                                            {(['daily', 'weekly', 'monthly'] as const).map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setFrequency(f)}
                                                    className={cn(
                                                        "flex-1 text-xs py-1.5 rounded capitalize transition-colors",
                                                        frequency === f ? "bg-indigo-500 text-white shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                    )}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Platforms</label>
                                        <div className="flex flex-wrap gap-2">
                                            {API_PLATFORMS.map(p => (
                                                <button
                                                    key={p}
                                                    onClick={() => togglePlatform(p)}
                                                    className={cn(
                                                        "px-2 py-1 text-xs rounded border transition-colors capitalize",
                                                        platforms.includes(p)
                                                            ? "bg-violet-900/30 border-indigo-500/50 text-indigo-300"
                                                            : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-ghost)] hover:border-[var(--border-hover)]"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setIsFormOpen(false)} disabled={creating}>Cancel</Button>
                                    <Button onClick={handleCreate} disabled={creating || !prompt || platforms.length === 0}>
                                        {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Save Schedule
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {schedules.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-ghost)] bg-[var(--surface-elevated)]/30 rounded-lg border border-[var(--border)] border-dashed">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No scheduled scans found.</p>
                                <Button variant="ghost" onClick={() => setIsFormOpen(true)} className="text-indigo-400 hover:text-indigo-300 hover:bg-transparent p-0 h-auto font-normal underline-offset-4 hover:underline">
                                    Create your first schedule
                                </Button>
                            </div>
                        ) : (
                            schedules.map(schedule => (
                                <div key={schedule.id} className="flex items-center justify-between p-4 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-colors">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-[var(--text-primary)] truncate" title={schedule.prompt}>{schedule.prompt}</h4>
                                            <Badge variant="outline" className="text-xs capitalize border-[var(--border-hover)] text-[var(--text-muted)]">
                                                {schedule.frequency}
                                            </Badge>
                                            <span className={cn(
                                                "w-2 h-2 rounded-full",
                                                schedule.status === 'active' ? "bg-green-500" : "bg-yellow-500"
                                            )} title={`Status: ${schedule.status}`} />
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-[var(--text-ghost)]">
                                            <span className="flex items-center gap-1">
                                                <RefreshCw className="w-3 h-3" />
                                                Platforms: {schedule.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Next run: {new Date(schedule.next_run_at).toLocaleDateString()} {new Date(schedule.next_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Status toggle could go here */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-[var(--text-ghost)] hover:text-red-400"
                                            onClick={() => handleDelete(schedule.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Minimal Lucid Icon missing fix if needed, assuming they're imported above.
function Save({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
    )
}
