"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { ScanProgress } from "@/components/marketing/scan-progress";

// Landing-hero live scan widget. Takes brand name + a test query, runs
// a real Gemini scan through /api/scan/public, redirects to the
// shareable receipt at /scan/{id}. No signup gate for the first 3
// scans per week per visitor.

type State = 'idle' | 'submitting' | 'error';

interface RateLimitError {
    error: 'rate_limited';
    message: string;
    resetInDays: number;
}

export function FreeScanWidget() {
    const router = useRouter();
    const [brand, setBrand]   = useState('');
    const [prompt, setPrompt] = useState('');
    const [state, setState]   = useState<State>('idle');
    const [errMsg, setErrMsg] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!brand.trim() || !prompt.trim()) return;
        setState('submitting');
        setErrMsg(null);

        try {
            const res = await fetch('/api/scan/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brandName: brand.trim(), prompt: prompt.trim() }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.status === 429) {
                setState('error');
                setErrMsg(
                    (data as RateLimitError).message ??
                    "You've used your free scans for this week."
                );
                return;
            }

            if (!res.ok) {
                setState('error');
                setErrMsg(
                    data?.error === 'invalid_brand_name' ? 'Brand name looks off, try a real brand.' :
                    data?.error === 'invalid_prompt'     ? 'Prompt should be 8–240 characters.' :
                    data?.error === 'scan_failed'        ? "Gemini didn't return a response. Try again." :
                    'Something went wrong. Try again in a moment.'
                );
                return;
            }

            // Success, redirect to the receipt.
            const shareUrl = data.shareUrl || `/scan/${data.scanId}`;
            router.push(shareUrl);
        } catch {
            setState('error');
            setErrMsg('Network error. Try again.');
        }
    }

    const disabled = state === 'submitting' || !brand.trim() || !prompt.trim();

    return (
        <div className="rounded-lg border border-white/[0.08] bg-black p-5 max-w-xl mx-auto">
            <div className="mb-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1.5">
                    Live scan · free · no signup
                </div>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                    Aelo asks Gemini your question, analyzes the response, gives you a
                    shareable receipt. 3 scans per week per visitor.
                </p>
            </div>

            {state === 'submitting' ? (
                <ScanProgress brand={brand} prompt={prompt} />
            ) : (
                <form onSubmit={submit} className="space-y-3">
                    <div>
                        <label className="block text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                            Your brand
                        </label>
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Notion"
                            className="w-full px-3 py-2 text-[14px] bg-[#050506] border border-white/[0.08] rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--accent-base)]/40 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-mono uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                            A high-intent question your buyers ask
                        </label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Best team wiki for engineering docs in 2026"
                            className="w-full px-3 py-2 text-[14px] bg-[#050506] border border-white/[0.08] rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--accent-base)]/40 transition-colors"
                        />
                    </div>

                    {errMsg && (
                        <div className="flex items-start gap-2 text-[12.5px] text-[var(--data-red)]">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{errMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={disabled}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[14px] bg-[var(--accent-base)] text-[var(--text-on-accent)] rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Run free scan
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </form>
            )}

            <p className="mt-3 text-[10.5px] font-mono text-zinc-600 text-center">
                Every scan is a real Gemini query, receipt is public + shareable.
            </p>
        </div>
    );
}
