"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Play, Pause, Trash2, Calendar, Clock, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AddScheduleModal } from "./add-schedule-modal";

interface Schedule {
    id: string;
    prompt: string;
    platforms: string[];
    competitors: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
    status: 'active' | 'paused';
    last_run_at: string | null;
    next_run_at: string;
    created_at: string;
}

interface ScheduledScansProps {
    platformsMap: { id: string; name: string; color?: string }[];
}

export function ScheduledScans({ platformsMap }: ScheduledScansProps) {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchSchedules = async () => {
        try {
            const res = await fetch('/api/llm/scheduled');
            if (res.ok) {
                const data = await res.json();
                setSchedules(data.schedules || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedules();
    }, []);

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active';
        // Optimistic UI update
        setSchedules(schedules.map(s => s.id === id ? { ...s, status: newStatus as 'active' | 'paused' } : s));
        try {
            await fetch(`/api/llm/scheduled/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (err) {
            console.error(err);
            // Revert on error
            setSchedules(schedules.map(s => s.id === id ? { ...s, status: currentStatus as 'active' | 'paused' } : s));
        }
    };

    const deleteSchedule = async (id: string) => {
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        try {
            await fetch(`/api/llm/scheduled/${id}`, { method: 'DELETE' });
            setSchedules(schedules.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">Automated Tracking</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Configure LLM scans to run automatically in the background.</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="bg-indigo-500 hover:bg-violet-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Schedule
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
            ) : schedules.length === 0 ? (
                <Card className="bg-[var(--bg-surface)] border-[var(--border-default)] border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Calendar className="w-12 h-12 text-[var(--text-ghost)] mb-4" />
                        <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No active schedules</h3>
                        <p className="text-[var(--text-ghost)] max-w-sm mb-6">Set up automated scans to track your brand visibility without lifting a finger.</p>
                        <Button onClick={() => setShowAddModal(true)} variant="outline">
                            Create First Schedule
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {schedules.map(schedule => (
                        <Card key={schedule.id} className="bg-[var(--bg-surface)] border-[var(--border-default)] transition-colors hover:border-[var(--border-default)]">
                            <CardContent className="p-5 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge variant={schedule.status === 'active' ? 'default' : 'outline'} className="capitalize bg-opacity-20">
                                            {schedule.status === 'active' ? 'Active' : 'Paused'}
                                        </Badge>
                                        <Badge variant="outline" className="capitalize flex items-center gap-1 border-[var(--border-default)] text-[var(--text-secondary)]">
                                            <Clock className="w-3 h-3" />
                                            {schedule.frequency}
                                        </Badge>
                                    </div>
                                    <h4 className="text-lg font-medium text-[var(--text-primary)] truncate mb-1">"{schedule.prompt}"</h4>
                                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-ghost)]">
                                        <div className="flex items-center gap-1.5">
                                            <Bot className="w-3.5 h-3.5" />
                                            <div className="flex gap-1">
                                                {schedule.platforms.map(p => {
                                                    const platformInfo = platformsMap.find(x => x.id === p);
                                                    return (
                                                        <div key={p} className={cn("w-2 h-2 rounded-full", platformInfo?.color || "bg-zinc-500")} title={platformInfo?.name || p} />
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        {schedule.last_run_at && (
                                            <span>Last run: {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}</span>
                                        )}
                                        {schedule.next_run_at && schedule.status === 'active' && (
                                            <span className="text-indigo-400">Next: {new Date(schedule.next_run_at).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => toggleStatus(schedule.id, schedule.status)}
                                        className={schedule.status === 'active' ? 'text-[var(--text-secondary)] hover:text-amber-400' : 'text-[var(--text-secondary)] hover:text-green-400'}
                                        title={schedule.status === 'active' ? 'Pause Schedule' : 'Resume Schedule'}
                                    >
                                        {schedule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteSchedule(schedule.id)}
                                        className="text-[var(--text-ghost)] hover:text-red-400"
                                        title="Delete Schedule"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AddScheduleModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchSchedules}
                platformsMap={platformsMap}
            />
        </div>
    );
}
