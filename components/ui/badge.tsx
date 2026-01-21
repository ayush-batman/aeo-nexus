import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: "default" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                variant === "default" &&
                "bg-violet-500/10 text-violet-400 border border-violet-500/20",
                variant === "success" &&
                "bg-green-500/10 text-green-400 border border-green-500/20",
                variant === "warning" &&
                "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                variant === "destructive" &&
                "bg-red-500/10 text-red-400 border border-red-500/20",
                variant === "outline" &&
                "border border-zinc-700 text-zinc-400",
                className
            )}
            {...props}
        />
    );
}
