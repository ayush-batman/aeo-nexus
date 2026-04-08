"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam === 'callback_failed') {
            setError('Login link expired or invalid. Please try again.');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const supabase = createClient();

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                throw signInError;
            }

            if (data.user) {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            console.error("Login error:", err);
            if (err instanceof Error) {
                if (err.message.includes("Invalid login credentials") || err.message.includes("invalid_grant")) {
                    setError("Invalid email or password. Please check your credentials.");
                } else if (err.message.includes("Email not confirmed")) {
                    setError("Please confirm your email address before signing in.");
                } else {
                    setError(err.message);
                }
            } else {
                setError("An unexpected error occurred during sign in");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 22h20L12 2z" className="fill-[var(--accent-base)]" />
                        <path d="M12 9L7 19h10L12 9z" className="fill-black" />
                    </svg>
                    <span className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                        Aelo
                    </span>
                </div>

                {/* Card */}
                <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    <h1 className="text-xl font-semibold text-[var(--text-primary)] text-center mb-1">
                        Welcome back
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
                        Sign in to your account to continue
                    </p>

                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-[var(--data-red-muted)] border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Email
                            </label>
                            <Input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Password
                            </label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <input
                                    type="checkbox"
                                    className="rounded border-[var(--border-default)] bg-[var(--bg-surface)]"
                                />
                                Remember me
                            </label>
                            <Link href="/forgot-password" className="text-[var(--accent-base)] hover:text-[var(--accent-hover)] transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="text-[var(--accent-base)] hover:text-[var(--accent-hover)] transition-colors">
                            Sign up
                        </Link>
                    </div>

                    {process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === 'true' && (
                        <div className="mt-6 pt-6 border-t border-[var(--border-default)]">
                            <Button
                                variant="outline"
                                className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                                onClick={() => {
                                    document.cookie = "dev-auth-bypass=true; path=/; max-age=86400";
                                    router.push("/dashboard");
                                }}
                                type="button"
                            >
                                ⚠️ Dev Bypass Login
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center p-6">
                <Loader2 className="w-8 h-8 text-[var(--accent-base)] animate-spin" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
