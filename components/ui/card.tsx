import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> { }

export function Card({ className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] transition-colors",
                className
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: CardProps) {
    return (
        <div
            className={cn("flex flex-col space-y-1.5 p-6", className)}
            {...props}
        />
    );
}

export function CardTitle({ className, ...props }: CardProps) {
    return (
        <h3
            className={cn("text-base font-semibold font-display text-[var(--text-primary)] tracking-tight", className)}
            {...props}
        />
    );
}

export function CardDescription({ className, ...props }: CardProps) {
    return (
        <p className={cn("text-sm text-[var(--text-secondary)]", className)} {...props} />
    );
}

export function CardContent({ className, ...props }: CardProps) {
    return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
    return (
        <div
            className={cn("flex items-center p-6 pt-0", className)}
            {...props}
        />
    );
}
