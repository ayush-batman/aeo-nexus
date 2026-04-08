"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface OnboardingCheckProps {
    children: React.ReactNode;
}

export function OnboardingCheck({ children }: OnboardingCheckProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        async function checkOnboarding() {
            // Skip check if already on onboarding page
            if (pathname === '/onboarding') {
                setChecking(false);
                return;
            }

            try {
                const res = await fetch('/api/onboarding/context');
                const data = await res.json();

                if (!res.ok) {
                    setChecking(false);
                    return;
                }

                if (data.onboardingCompleted) {
                    setChecking(false);
                    return;
                }

                if (!data.hasBrand) {
                    router.push('/onboarding');
                    return;
                }

                setChecking(false);
            } catch (error) {
                console.error('Onboarding check error:', error);
                setChecking(false);
            }
        }

        checkOnboarding();
    }, [pathname, router]);

    if (checking) {
        return (
            <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
