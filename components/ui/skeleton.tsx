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
        <div className="mx-auto max-w-[1480px] space-y-14 px-5 py-10 sm:px-8 lg:px-14 lg:py-14">
            <div className="grid gap-12 border-b border-[var(--border-default)] pb-16 lg:grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)] lg:gap-20">
                <div className="flex min-h-[500px] flex-col justify-between py-2">
                    <div>
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="mt-10 h-20 w-[82%]" />
                        <Skeleton className="mt-3 h-20 w-[68%]" />
                        <Skeleton className="mt-9 h-4 w-[88%]" />
                        <Skeleton className="mt-3 h-4 w-[74%]" />
                        <Skeleton className="mt-9 h-11 w-52" />
                    </div>
                    <div className="grid grid-cols-3 border-y border-[var(--border-default)] py-5">
                        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="px-4 first:pl-0"><Skeleton className="h-2.5 w-14" /><Skeleton className="mt-3 h-6 w-12" /></div>)}
                    </div>
                </div>
                <div className="relative px-5 pt-10">
                    <div className="min-h-[500px] bg-[var(--bg-evidence)] p-9">
                        <Skeleton className="h-3 w-full bg-[#DDE1DA]" />
                        <Skeleton className="mt-9 h-7 w-[84%] bg-[#DDE1DA]" />
                        <Skeleton className="mt-3 h-7 w-[58%] bg-[#DDE1DA]" />
                        <Skeleton className="mt-10 h-4 w-full bg-[#DDE1DA]" />
                        <Skeleton className="mt-3 h-4 w-[92%] bg-[#DDE1DA]" />
                        <Skeleton className="mt-3 h-4 w-[76%] bg-[#DDE1DA]" />
                    </div>
                </div>
            </div>
            <div>
                <Skeleton className="h-7 w-52" />
                <Skeleton className="mt-3 h-4 w-80" />
                <div className="mt-7 grid border-y border-[var(--border-default)] sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => <div key={index} className="min-h-44 border-b border-[var(--border-default)] py-7 sm:px-6 lg:border-b-0 lg:border-r"><Skeleton className="h-3 w-20" /><Skeleton className="mt-6 h-10 w-24" /><Skeleton className="mt-8 h-2 w-full" /></div>)}
                </div>
            </div>
        </div>
    );
}
