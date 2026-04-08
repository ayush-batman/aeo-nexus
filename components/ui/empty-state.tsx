import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
            <div className="relative mb-6">
                <div className="relative rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-5">
                    <Icon className="w-8 h-8 text-[var(--text-ghost)]" />
                </div>
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-1 text-center">{title}</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm text-center mb-6">{description}</p>
            {action && (
                <Button
                    variant="outline"
                    onClick={action.onClick}
                    className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                >
                    {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                    {action.label}
                </Button>
            )}
        </div>
    );
}
