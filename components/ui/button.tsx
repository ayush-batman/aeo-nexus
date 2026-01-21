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
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    // Variants
                    variant === "default" &&
                    "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25",
                    variant === "secondary" &&
                    "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700",
                    variant === "outline" &&
                    "border border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800",
                    variant === "ghost" &&
                    "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
                    variant === "destructive" &&
                    "bg-red-600 text-white hover:bg-red-700",
                    // Sizes
                    size === "default" && "h-10 px-4 py-2 text-sm",
                    size === "sm" && "h-8 px-3 text-xs",
                    size === "lg" && "h-12 px-6 text-base",
                    size === "icon" && "h-10 w-10",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
