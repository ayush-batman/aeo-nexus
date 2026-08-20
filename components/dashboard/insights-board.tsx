"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Insight, InsightCategory, InsightPriority } from "@/lib/insights";

type Lane = "suggested" | "todo" | "doing" | "done";

const LANES: { id: Lane; label: string }[] = [
    { id: "suggested", label: "Suggested" },
    { id: "todo", label: "To do" },
    { id: "doing", label: "Doing" },
    { id: "done", label: "Done" },
];

const CATEGORY: Record<InsightCategory, { label: string; color: string }> = {
    visibility: { label: "Visibility", color: "var(--accent-base)" },
    narrative:  { label: "Narrative",  color: "#7aa2f7" },
    sentiment:  { label: "Sentiment",  color: "var(--data-amber)" },
    audit:      { label: "Audit",      color: "var(--text-secondary)" },
    citation:   { label: "Citation",   color: "var(--data-green)" },
};

const PRIORITY: Record<InsightPriority, { label: string; color: string }> = {
    high:   { label: "High",   color: "var(--data-red)" },
    medium: { label: "Medium", color: "var(--data-amber)" },
    low:    { label: "Low",    color: "var(--text-ghost)" },
};

export function InsightsBoard({ insights, workspaceId }: { insights: Insight[]; workspaceId: string }) {
    const storageKey = `aelo-insights-lanes-${workspaceId}`;
    const [lanes, setLanes] = useState<Record<string, Lane>>({});
    const [dragId, setDragId] = useState<string | null>(null);

    // Load saved lane placement (client-only, per browser).
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
            setLanes(saved && typeof saved === "object" ? saved : {});
        } catch { /* ignore */ }
    }, [storageKey]);

    function laneOf(id: string): Lane {
        return lanes[id] ?? "suggested";
    }

    function move(id: string, lane: Lane) {
        setLanes((prev) => {
            const next = { ...prev, [id]: lane };
            try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {LANES.map((lane) => {
                const cards = insights.filter((i) => laneOf(i.id) === lane.id);
                return (
                    <div
                        key={lane.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, lane.id); setDragId(null); }}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-3 min-h-[200px]"
                    >
                        <div className="flex items-center justify-between px-1 mb-3">
                            <span className="text-[11px] uppercase tracking-widest text-[var(--text-ghost)]">{lane.label}</span>
                            <span className="text-[11px] tabular-nums text-[var(--text-ghost)]">{cards.length}</span>
                        </div>

                        <div className="space-y-2.5">
                            {cards.map((i) => {
                                const cat = CATEGORY[i.category];
                                const pri = PRIORITY[i.priority];
                                return (
                                    <div
                                        key={i.id}
                                        draggable
                                        onDragStart={() => setDragId(i.id)}
                                        onDragEnd={() => setDragId(null)}
                                        className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 cursor-grab active:cursor-grabbing hover:border-[var(--border-active)] transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span
                                                className="text-[10px] uppercase tracking-widest font-medium px-1.5 py-0.5 rounded"
                                                style={{ color: cat.color, background: `color-mix(in srgb, ${cat.color} 12%, transparent)` }}
                                            >
                                                {cat.label}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-widest" style={{ color: pri.color }}>
                                                {pri.label}
                                            </span>
                                        </div>
                                        <div className="text-[13.5px] font-medium text-[var(--text-primary)] leading-snug mb-1.5">
                                            {i.title}
                                        </div>
                                        <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mb-3">
                                            {i.detail}
                                        </p>
                                        <Link
                                            href={i.actionHref}
                                            className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent-base)] hover:underline"
                                        >
                                            {i.actionLabel} <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                );
                            })}
                            {cards.length === 0 && (
                                <div className="text-[12px] text-[var(--text-ghost)] px-1 py-6 text-center">
                                    Drag cards here
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
