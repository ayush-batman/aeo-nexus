import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(date);
}

export function truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.slice(0, length) + "...";
}

// Sage rule: zero is honest, not alarming. Numeric magnitude is neutral by
// default. We only use red for a *drop* (negative delta), never for a low
// absolute value.
export function getScoreColor(score: number): string {
    if (score >= 80) return "text-[var(--data-green)]";
    if (score >= 60) return "text-[var(--data-teal)]";
    if (score >= 40) return "text-[var(--data-amber)]";
    if (score >= 1)  return "text-[var(--text-primary)]";
    return "text-[var(--text-tertiary)]";
}

export function getScoreBgColor(score: number): string {
    if (score >= 80) return "bg-[var(--data-green-muted)] border-[var(--data-green)]/30";
    if (score >= 60) return "bg-[var(--data-teal-muted)] border-[var(--data-teal)]/30";
    if (score >= 40) return "bg-[var(--data-amber-muted)] border-[var(--data-amber)]/30";
    if (score >= 1)  return "bg-[var(--bg-raised)] border-[var(--border-default)]";
    return "bg-[var(--bg-surface)] border-[var(--border-subtle)]";
}

export function getPriorityLabel(score: number): { label: string; emoji: string } {
    // emoji kept as empty string for callers that still spread it — Sage rule:
    // no emojis in product copy. Labels are the whole story.
    if (score >= 80) return { label: "HOT",    emoji: "" };
    if (score >= 65) return { label: "HIGH",   emoji: "" };
    if (score >= 50) return { label: "MEDIUM", emoji: "" };
    return { label: "LOW", emoji: "" };
}
