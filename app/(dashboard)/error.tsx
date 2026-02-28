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
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-10 max-w-lg text-center">
                <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-5" />
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                    Something went wrong
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                    {error.message || "An unexpected error occurred while loading this page."}
                </p>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={reset}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                    <Link href="/dashboard">
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
