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
            <div className="min-h-screen" style={{ background: 'var(--background)' }}>
                {/* Ambient background glow */}
                <div className="fixed inset-0 pointer-events-none z-0 bg-glow" />

                <Sidebar />
                <main className="pl-64 transition-all duration-300 relative z-10">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </OnboardingCheck>
    );
}
