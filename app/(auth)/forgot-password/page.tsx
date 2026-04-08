"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, AlertCircle, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const supabase = createClient();

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                throw resetError;
            }

            setSuccess(true);
        } catch (err) {
            console.error("Password reset error:", err);
            setError(err instanceof Error ? err.message : "Failed to send reset email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
                        <path d="M14 3 A11 11 0 1 1 5.2 20.5" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <circle cx="14" cy="14" r="3" fill="var(--accent-base)" />
                    </svg>
                    <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                        Aelo
                    </span>
                </div>

                {/* Card */}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-400" />
                            </div>
                            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                                Check your email
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                We&apos;ve sent a password reset link to <strong className="text-[var(--text-primary)]">{email}</strong>
                            </p>
                            <Link href="/login">
                                <Button variant="outline" className="w-full">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Sign In
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center mb-2">
                                Forgot your password?
                            </h1>
                            <p className="text-sm text-[var(--text-secondary)] text-center mb-8">
                                Enter your email and we&apos;ll send you a reset link
                            </p>

                            {error && (
                                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4" />
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

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 text-center">
                                <Link href="/login" className="text-sm text-[var(--accent-base)] hover:text-[var(--text-secondary)] flex items-center justify-center gap-1">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Sign In
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
