import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> { }

export function Card({ className, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm",
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
            className={cn("text-xl font-semibold text-zinc-100", className)}
            {...props}
        />
    );
}

export function CardDescription({ className, ...props }: CardProps) {
    return (
        <p className={cn("text-sm text-zinc-400", className)} {...props} />
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
