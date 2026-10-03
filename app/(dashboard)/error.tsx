"use client";

import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 sm:p-8">
            <div role="alert" className="w-full max-w-lg rounded-2xl border border-[var(--data-red)]/25 bg-[var(--data-red-muted)] p-6 text-center sm:p-10">
                <AlertCircle className="w-14 h-14 text-[var(--data-red)] mx-auto mb-5" />
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                    Something went wrong
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                    {error.message || "An unexpected error occurred while loading this page."}
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Button variant="outline" onClick={reset}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-base)]/40 lg:min-h-10">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
