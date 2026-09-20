"use client";

import { useState, useRef } from "react";
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
    const requestRef = useRef<{ fingerprint: string; id: string } | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!brand.trim() || !prompt.trim()) return;
        setState('submitting');
        setErrMsg(null);

        try {
            const fingerprint = JSON.stringify([brand.trim(), prompt.trim()]);
            if (requestRef.current?.fingerprint !== fingerprint) requestRef.current = { fingerprint, id: crypto.randomUUID() };
            const res = await fetch('/api/scan/public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestRef.current.id },
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
                if (data?.error === 'scan_failed') requestRef.current = null;
                setState('error');
                setErrMsg(
                    data?.error === 'invalid_public_scan' ? 'Use a brand name between 2 and 80 characters and a question between 8 and 240 characters.' :
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
        <div className="w-full rounded-sm bg-[#f3f1e9] p-6 text-[#1d2523] shadow-[0_24px_80px_rgba(0,0,0,.22)] sm:p-8">
            <div className="mb-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#d2d7cf] pb-4 font-mono text-xs uppercase tracking-widest text-[#586560]">
                    <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#7db89d]" />Gemini / live answer</span>
                    <span>No signup</span>
                </div>
                <p className="max-w-md text-base leading-relaxed text-[#53615d]">
                    Name your brand. Ask one buyer question. Aelo returns the real answer and keeps the receipt.
                </p>
            </div>

            {state === 'submitting' ? (
                <ScanProgress brand={brand} prompt={prompt} />
            ) : (
                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <label htmlFor="free-scan-brand" className="mb-2 block font-mono text-xs uppercase tracking-widest text-[#53615d]">
                            Your brand
                        </label>
                        <input
                            id="free-scan-brand"
                            type="text"
                            required
                            minLength={2}
                            maxLength={80}
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Notion"
                            autoComplete="organization"
                            className="min-h-11 w-full rounded-sm border border-[#adb8b0] bg-[#fbfaf5] px-3 py-2 text-base text-[#1d2523] placeholder:text-[#87928e] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#416a88] focus:outline-none focus:ring-2 focus:ring-[#a8cbe0]/50"
                        />
                    </div>
                    <div>
                        <label htmlFor="free-scan-prompt" className="mb-2 block font-mono text-xs uppercase tracking-widest text-[#53615d]">
                            A question your buyers ask
                        </label>
                        <input
                            id="free-scan-prompt"
                            type="text"
                            required
                            minLength={8}
                            maxLength={240}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Best team wiki for engineering docs in 2026"
                            className="min-h-11 w-full rounded-sm border border-[#adb8b0] bg-[#fbfaf5] px-3 py-2 text-base text-[#1d2523] placeholder:text-[#87928e] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#416a88] focus:outline-none focus:ring-2 focus:ring-[#a8cbe0]/50"
                        />
                    </div>

                    {errMsg && (
                        <div role="alert" className="flex items-start gap-2 rounded-sm bg-[#f0dfd9] p-3 text-sm text-[#895345]">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{errMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={disabled}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#416a88] px-4 py-2 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-[#315873] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#416a88] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f3f1e9] disabled:cursor-not-allowed disabled:bg-[#c8ceca] disabled:text-[#69746f] disabled:hover:translate-y-0"
                    >
                        Run one real answer
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </form>
            )}

            <p className="mt-5 text-center font-mono text-xs uppercase tracking-widest text-[#586560]">
                3 scans each week · no card · failed scans stay failed
            </p>
            <p className="mt-2 text-center text-xs leading-relaxed text-[#69746f]">
                Your receipt also previews how Radar adds repeat samples, confidence and source tracking.
            </p>
        </div>
    );
}
