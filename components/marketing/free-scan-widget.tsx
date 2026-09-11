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
        <div className="w-full rounded-3xl border border-[#cdd6ff] bg-white p-5 text-[#111936] shadow-[0_24px_70px_rgba(49,55,124,0.14)] sm:p-6">
            <div className="mb-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#dff7f1] px-3 py-2 text-xs font-semibold text-[#17695d]">
                        <span className="size-2 rounded-full bg-[#27a992]" />
                        Live Gemini scan
                    </span>
                    <span className="rounded-full bg-[#fff5c8] px-3 py-2 text-xs font-semibold text-[#6e6119]">No signup</span>
                </div>
                <p className="text-sm leading-relaxed text-[#58627d]">
                    Ask one question your buyers ask. Aelo returns the answer and keeps the receipt.
                </p>
            </div>

            {state === 'submitting' ? (
                <ScanProgress brand={brand} prompt={prompt} />
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label htmlFor="free-scan-brand" className="mb-2 block text-xs font-semibold text-[#303b5c]">
                            Your brand
                        </label>
                        <input
                            id="free-scan-brand"
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Notion"
                            autoComplete="organization"
                            className="min-h-11 w-full rounded-xl border border-[#cdd6e7] bg-[#f7f8ff] px-3 py-2 text-base text-[#111936] placeholder:text-[#8c96af] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#6d63f7] focus:bg-white focus:outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="free-scan-prompt" className="mb-2 block text-xs font-semibold text-[#303b5c]">
                            A question your buyers ask
                        </label>
                        <input
                            id="free-scan-prompt"
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Best team wiki for engineering docs in 2026"
                            className="min-h-11 w-full rounded-xl border border-[#cdd6e7] bg-[#f7f8ff] px-3 py-2 text-base text-[#111936] placeholder:text-[#8c96af] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus:border-[#6d63f7] focus:bg-white focus:outline-none"
                        />
                    </div>

                    {errMsg && (
                        <div role="alert" className="flex items-start gap-2 rounded-xl bg-[#fff0ed] p-3 text-sm text-[#a83c31]">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>{errMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={disabled}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6d63f7] px-4 py-2 text-base font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[#5d53e8] disabled:cursor-not-allowed disabled:bg-[#dcddff] disabled:text-[#5554a7]"
                    >
                        See the real answer
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </form>
            )}

            <p className="mt-4 text-center text-xs text-[#77819d]">
                Three scans each week. No card. Failed scans stay failed.
            </p>
        </div>
    );
}
