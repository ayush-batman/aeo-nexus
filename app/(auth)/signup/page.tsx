import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                        AEO Nexus
                    </span>
                </div>

                {/* Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
                    <h1 className="text-2xl font-semibold text-zinc-100 text-center mb-2">
                        Create your account
                    </h1>
                    <p className="text-sm text-zinc-400 text-center mb-8">
                        Start your 14-day free trial
                    </p>

                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Full Name
                            </label>
                            <Input type="text" placeholder="John Doe" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Email
                            </label>
                            <Input type="email" placeholder="you@example.com" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Password
                            </label>
                            <Input type="password" placeholder="••••••••" />
                        </div>

                        <div className="text-sm text-zinc-400">
                            By signing up, you agree to our{" "}
                            <Link href="/terms" className="text-violet-400 hover:text-violet-300">
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="text-violet-400 hover:text-violet-300">
                                Privacy Policy
                            </Link>
                        </div>

                        <Button type="submit" className="w-full">
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-zinc-400">
                        Already have an account?{" "}
                        <Link href="/login" className="text-violet-400 hover:text-violet-300">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
