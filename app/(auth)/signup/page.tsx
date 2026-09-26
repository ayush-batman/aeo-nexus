"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AeloWordmark } from "@/components/brand/logo";
import { GoogleSignInButton } from "@/components/auth/google-button";
import { planByCheckoutKey } from "@/lib/billing/plan-catalog";

function SignupForm() {
    const searchParams = useSearchParams();
    const planParam = searchParams.get('plan');
    const selectedPlanDefinition = planByCheckoutKey(planParam);
    const selectedPlan = selectedPlanDefinition?.checkoutKey === 'radar' || selectedPlanDefinition?.checkoutKey === 'command'
        ? selectedPlanDefinition.checkoutKey
        : null;
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

    useEffect(() => {
        let active = true;
        fetch('/api/auth/providers')
            .then(async (response) => response.ok ? response.json() as Promise<{ email?: boolean }> : null)
            .then((status) => { if (active) setEmailAvailable(status?.email === true); })
            .catch(() => { if (active) setEmailAvailable(false); });
        return () => { active = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailAvailable) {
            setError('Email signup is unavailable right now. Please use Google sign-up.');
            return;
        }
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const callbackURL = selectedPlan ? `/onboarding?plan=${selectedPlan}` : '/onboarding';
            const { error: signupError } = await authClient.signUp.email({
                email: email.trim(), password, name: name.trim(), callbackURL,
            });
            if (signupError) throw new Error(signupError.message || 'Unable to create your account.');
            setSuccess('Check your email to verify your account and continue to your first scan.');
        } catch (err) {
            console.error("Signup error:", err);
            setError(err instanceof Error ? err.message : "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center mb-8">
                    <AeloWordmark size="lg" />
                </div>

                {/* Card */}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    <h1 className="text-xl font-semibold text-[var(--text-primary)] text-center mb-1">
                        Create your account
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
                        No card. First scan in under a minute.
                    </p>

                    {selectedPlan && (
                        <div className="mb-6 rounded-md border border-[var(--accent-base)]/25 bg-[var(--accent-muted)] p-3 text-center">
                            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Selected after your free trial</p>
                            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                                {selectedPlanDefinition!.name} · {selectedPlanDefinition!.priceLabel}/mo
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">{selectedPlanDefinition!.scanPromise}</p>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">No checkout or charge happens during signup.</p>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-[var(--data-red-muted)] border border-[var(--data-red)]/25 flex items-center gap-2 text-[var(--data-red)] text-sm" role="alert" aria-live="assertive">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-[var(--data-green-muted)] border border-[var(--data-green)]/25 text-[var(--data-green)] text-sm" role="status" aria-live="polite">
                            {success}
                        </div>
                    )}

                    <GoogleSignInButton label="Sign up with Google" selectedPlan={selectedPlan} />

                    {emailAvailable === false && (
                        <p className="mb-4 text-sm text-[var(--text-secondary)]" role="status">
                            Email signup is unavailable right now. Use Google sign-up if shown above.
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="signup-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Full Name
                            </label>
                            <Input
                                id="signup-name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Email
                            </label>
                            <Input
                                id="signup-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="signup-password" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Password
                            </label>
                            <Input
                                id="signup-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                aria-describedby="signup-password-help"
                            />
                            <p id="signup-password-help" className="mt-1 text-xs text-[var(--text-tertiary)]">At least 8 characters.</p>
                        </div>

                        <div className="text-sm text-[var(--text-secondary)]">
                            By signing up, you agree to our{" "}
                            <Link href="/terms" className="text-[var(--accent-base)] hover:text-[var(--accent-hover)]">
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-[var(--accent-base)] hover:text-[var(--accent-hover)]">
                                Privacy Policy
                            </Link>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading || emailAvailable !== true}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                emailAvailable === null ? "Checking signup…" : "Create Account"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        Already have an account?{" "}
                        <Link href="/login" className="text-[var(--accent-base)] hover:text-[var(--text-secondary)]">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" role="status" aria-label="Loading signup" />}>
            <SignupForm />
        </Suspense>
    );
}
