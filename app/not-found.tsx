import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AeloWordmark } from "@/components/brand/logo";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                {/* Logo */}
                <Link href="/" className="inline-flex mb-12">
                    <AeloWordmark size="lg" />
                </Link>

                {/* 404 */}
                <div className="relative mb-8">
                    <div className="text-[10rem] font-black text-[var(--bg-raised)] leading-none select-none">
                        404
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Search className="w-8 h-8 text-indigo-400" />
                        </div>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                    Page not found
                </h1>
                <p className="text-[var(--text-secondary)] mb-8">
                    The page you&apos;re looking for doesn&apos;t exist, or you may not have access to it.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/dashboard">
                        <Button className="bg-indigo-500 hover:bg-violet-700">
                            Go to Dashboard
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button variant="outline" className="border-[var(--border-default)] text-[var(--text-secondary)]">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
