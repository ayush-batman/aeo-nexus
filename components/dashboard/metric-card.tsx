import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: LucideIcon;
    iconColor?: string;
}

export function MetricCard({
    title,
    value,
    change,
    changeType = "neutral",
    icon: Icon,
    iconColor = "text-[var(--text-muted)]",
}: MetricCardProps) {
    return (
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-5 transition-colors hover:border-[var(--border-hover)]">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold font-display text-[var(--text-primary)] tracking-tight">{value}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-elevated)] flex items-center justify-center">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                </div>
            </div>
            {change && (
                <p
                    className={cn(
                        "mt-3 text-xs",
                        changeType === "positive" && "text-emerald-400",
                        changeType === "negative" && "text-rose-400",
                        changeType === "neutral" && "text-[var(--text-muted)]"
                    )}
                >
                    {change}
                </p>
            )}
        </div>
    );
}
