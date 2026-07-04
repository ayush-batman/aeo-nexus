import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                variant === "default" &&
                "bg-[var(--accent-muted)] text-[var(--accent-base)] border border-[var(--accent-base)]/25",
                variant === "success" &&
                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15",
                variant === "warning" &&
                "bg-amber-500/10 text-amber-400 border border-amber-500/15",
                variant === "destructive" &&
                "bg-[var(--data-red-muted)] text-[var(--data-red)] border border-[var(--data-red)]/25",
                variant === "outline" &&
                "border border-[var(--border-default)] text-[var(--text-secondary)]",
                className
            )}
            {...props}
        />
    );
}
