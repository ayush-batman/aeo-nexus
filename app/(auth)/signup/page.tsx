"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            // Step 1: Create user via server-side API (auto-confirms email)
            const signupRes = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    fullName: name.trim(),
                }),
            });

            const signupData = await signupRes.json();

            if (!signupRes.ok) {
                throw new Error(signupData.error || "Failed to create account");
            }

            // Step 2: Auto sign-in with the newly created account
            const supabase = createClient();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                // Account created but auto-login failed — redirect to login
                setSuccess("Account created! Please sign in.");
                setTimeout(() => router.push("/login"), 1500);
                return;
            }

            // Step 3: Redirect to onboarding
            router.push("/onboarding");
            router.refresh();
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
                        Create your account
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
                        Start your 14-day free trial
                    </p>

                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-[var(--data-red-muted)] border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Full Name
                            </label>
                            <Input
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

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
                                minLength={6}
                            />
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

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                "Create Account"
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
