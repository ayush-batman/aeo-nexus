"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OnboardingCheck } from "@/components/onboarding-check";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <OnboardingCheck>
            <DashboardShell>
                <ErrorBoundary>{children}</ErrorBoundary>
            </DashboardShell>
        </OnboardingCheck>
    );
}
