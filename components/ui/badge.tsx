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
                "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15",
                variant === "success" &&
                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15",
                variant === "warning" &&
                "bg-amber-500/10 text-amber-400 border border-amber-500/15",
                variant === "destructive" &&
                "bg-rose-500/10 text-rose-400 border border-rose-500/15",
                variant === "outline" &&
                "border border-[var(--border-default)] text-[var(--text-secondary)]",
                className
            )}
            {...props}
        />
    );
}
