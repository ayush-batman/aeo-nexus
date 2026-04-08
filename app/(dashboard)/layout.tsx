"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { OnboardingCheck } from "@/components/onboarding-check";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OnboardingCheck>
            <div className="min-h-screen bg-[var(--bg-base)]">
                <Sidebar />
                <main className="pl-60 transition-all duration-200 relative">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </OnboardingCheck>
    );
}
