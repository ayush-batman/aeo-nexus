import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
    size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-base)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-40",
                    // Variants
                    variant === "default" &&
                    "bg-indigo-500 text-white hover:bg-indigo-400 active:scale-[0.98]",
                    variant === "secondary" &&
                    "bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)]",
                    variant === "outline" &&
                    "border border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-active)]",
                    variant === "ghost" &&
                    "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]",
                    variant === "destructive" &&
                    "bg-rose-600 text-white hover:bg-rose-500",
                    // Sizes
                    size === "default" && "h-9 px-4 py-2 text-sm",
                    size === "sm" && "h-7 px-3 text-xs",
                    size === "lg" && "h-11 px-6 text-sm",
                    size === "icon" && "h-9 w-9",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
