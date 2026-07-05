import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    changeType?: "positive" | "negative" | "neutral";
    icon: LucideIcon;
    accentColor?: "violet" | "teal" | "emerald" | "danger" | "amber" | "cyan";
    // Sage trust affordance: when set, the whole card becomes clickable and
    // the caller can pop a receipt drawer showing the scans behind this number.
    onClick?: () => void;
    receiptHint?: string; // e.g. "See the receipt →"
}

const accentMap = {
    violet: {
        glowLine: "var(--accent-base)",
        iconBg:   "var(--accent-muted)",
        iconClr:  "var(--accent-base)",
    },
    teal: {
        glowLine: "var(--data-teal)",
        iconBg:   "var(--data-teal-muted)",
        iconClr:  "var(--data-teal)",
    },
    emerald: {
        glowLine: "var(--data-green)",
        iconBg:   "var(--data-green-muted)",
        iconClr:  "var(--data-green)",
    },
    danger: {
        glowLine: "var(--data-red)",
        iconBg:   "var(--data-red-muted)",
        iconClr:  "var(--data-red)",
    },
    amber: {
        glowLine: "var(--data-amber)",
        iconBg:   "var(--data-amber-muted)",
        iconClr:  "var(--data-amber)",
    },
    cyan: {
        glowLine: "var(--data-cyan)",
        iconBg:   "var(--data-cyan-muted)",
        iconClr:  "var(--data-cyan)",
    },
};

export function MetricCard({
    title,
    value,
    change,
    changeType = "neutral",
    icon: Icon,
    accentColor = "violet",
    onClick,
    receiptHint = "See the receipt →",
}: MetricCardProps) {
    const accent = accentMap[accentColor];
    const clickable = Boolean(onClick);

    return (
        <div
            onClick={onClick}
            className={cn(
                "card-base relative overflow-hidden flex flex-col justify-between min-h-[140px]",
                clickable && "cursor-pointer hover:border-[var(--border-active)] transition-colors group",
            )}
        >
            {/* Top border glow line per spec */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-80"
                style={{ background: `linear-gradient(90deg, ${accent.glowLine}, transparent)` }}
            />

            <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-mono font-medium uppercase tracking-widest text-[var(--text-secondary)]">
                    {title}
                </p>
                <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: accent.iconBg }}
                >
                    <Icon className="w-4 h-4" style={{ color: accent.iconClr }} strokeWidth={1.5} />
                </div>
            </div>

            <div className="mt-auto">
                <p className="text-xl font-bold font-display tracking-wide text-[var(--text-primary)]">
                    {value}
                </p>

                {change && (
                    <div className="mt-2">
                        <span
                            className={cn(
                                "badge",
                                changeType === "positive" ? "badge-green" :
                                changeType === "negative" ? "badge-red" :
                                "bg-[var(--bg-hover)] text-[var(--text-tertiary)]"
                            )}
                        >
                            {change}
                        </span>
                    </div>
                )}
                {clickable && (
                    <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--text-ghost)] opacity-0 group-hover:opacity-100 transition-opacity">
                        {receiptHint}
                    </div>
                )}
            </div>
        </div>
    );
}
