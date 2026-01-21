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
    iconColor = "text-violet-400",
}: MetricCardProps) {
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-sm text-zinc-400">{title}</p>
                    <p className="text-3xl font-bold text-zinc-100">{value}</p>
                </div>
                <div
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        "bg-zinc-800"
                    )}
                >
                    <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
            </div>
            {change && (
                <p
                    className={cn(
                        "mt-3 text-sm",
                        changeType === "positive" && "text-green-400",
                        changeType === "negative" && "text-red-400",
                        changeType === "neutral" && "text-zinc-400"
                    )}
                >
                    {change}
                </p>
            )}
        </div>
    );
}
