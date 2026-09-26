"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
    );
}

export function GoogleSignInButton({ label = "Continue with Google", selectedPlan, showDivider = true }: { label?: string; selectedPlan?: "radar" | "command" | null; showDivider?: boolean }) {
    const [googleEnabled, setGoogleEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/auth/providers', { cache: 'no-store', signal: controller.signal })
            .then((response) => response.ok ? response.json() : Promise.reject(new Error('provider_status_unavailable')))
            .then((providers: { google?: boolean }) => setGoogleEnabled(providers.google === true))
            .catch((cause: unknown) => {
                if (!(cause instanceof DOMException && cause.name === 'AbortError')) setGoogleEnabled(false);
            });
        return () => controller.abort();
    }, []);

    async function signIn() {
        setLoading(true);
        setError(null);
        try {
            const callback = new URL('/auth/callback', window.location.origin);
            if (selectedPlan) callback.searchParams.set('plan', selectedPlan);
            const { error } = await authClient.signIn.social({
                provider: "google",
                callbackURL: callback.toString(),
            });
            // On success the browser redirects to Google, nothing else runs here.
            if (error) {
                setError(error.message || "Could not start Google sign-in.");
                setLoading(false);
            }
        } catch {
            setError("Could not start Google sign-in.");
            setLoading(false);
        }
    }

    if (!googleEnabled) return null;

    return (
        <>
        <div className="w-full">
            <button
                type="button"
                onClick={signIn}
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                {label}
            </button>
            {error && <p className="mt-2 text-xs text-[var(--data-red)]" role="alert">{error}</p>}
        </div>
        {showDivider && <div className="flex items-center gap-3 my-6" aria-hidden="true">
            <div className="flex-1 h-px bg-[var(--border-default)]" />
            <span className="text-xs text-[var(--text-tertiary)]">or</span>
            <div className="flex-1 h-px bg-[var(--border-default)]" />
        </div>}
        </>
    );
}
