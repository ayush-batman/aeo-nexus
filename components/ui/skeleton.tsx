import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-[var(--bg-raised)]",
                className
            )}
        />
    );
}

export function MetricCardSkeleton() {
    return (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

export function LLMMentionSkeleton() {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
            <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div>
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
        </div>
    );
}

export function ForumThreadSkeleton() {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
            <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div>
                    <Skeleton className="h-4 w-56 mb-2" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6">
            {/* Aelo Health Score Skeleton */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-3 w-28 mb-3" />
                        <div className="flex items-baseline gap-3">
                            <Skeleton className="h-10 w-16" />
                            <Skeleton className="h-5 w-10" />
                            <Skeleton className="h-5 w-24 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-64 mt-3" />
                    </div>
                    <Skeleton className="w-28 h-28 rounded-full hidden md:block" />
                </div>
            </div>

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <MetricCardSkeleton key={i} />
                ))}
            </div>

            {/* Two Column Layout Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                    <div className="flex justify-between mb-4">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-7 w-20" />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <LLMMentionSkeleton key={i} />
                        ))}
                    </div>
                </div>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
                    <div className="flex justify-between mb-4">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-7 w-20" />
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <ForumThreadSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
