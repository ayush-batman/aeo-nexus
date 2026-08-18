"use client";

import { useEffect, useState } from "react";

/*
 * ScanProgress — the scan-in-progress experience.
 *
 * Adapted from Beautiful UI (https://beautifului.dev), MIT License: the
 * Loading State (pixel-grid loader + elapsed timer) and Task Rows primitives,
 * restyled to Aelo's Sage tokens. The steps mirror the real scan pipeline.
 */

function stepLabels(brand: string): string[] {
    const who = brand.trim() || "your brand";
    return [
        "Sent your question to Gemini",
        "Reading Gemini’s answer",
        `Finding where ${who} appears`,
        "Building your receipt",
    ];
}

export function ScanProgress({ brand, prompt }: { brand: string; prompt: string }) {
    const labels = stepLabels(brand);
    const [elapsed, setElapsed] = useState(0);
    const [active, setActive] = useState(1);

    // Live elapsed timer.
    useEffect(() => {
        const start = performance.now();
        const t = setInterval(() => setElapsed((performance.now() - start) / 1000), 100);
        return () => clearInterval(t);
    }, []);

    // Advance the active step at a comfortable pace; hold on the last step
    // until the fetch resolves and the parent navigates away.
    useEffect(() => {
        const t = setInterval(
            () => setActive((a) => Math.min(a + 1, labels.length - 1)),
            1500,
        );
        return () => clearInterval(t);
    }, [labels.length]);

    return (
        <div className="rounded-lg border border-white/[0.08] bg-[#0d0d10] p-6">
            <style>{`
              @keyframes aelo-cell { 0%,100% { opacity: .12 } 50% { opacity: 1 } }
              @keyframes aelo-spin { to { transform: rotate(360deg) } }
            `}</style>

            <div className="flex items-baseline gap-2 mb-5">
                <span className="text-white text-[15px] font-semibold flex-shrink-0">
                    {brand.trim() || "Your brand"}
                </span>
                <span className="text-zinc-500 text-[13px] truncate">
                    &middot; &ldquo;{prompt}&rdquo;
                </span>
            </div>

            <div className="flex items-center gap-4 pb-5 mb-4 border-b border-white/[0.08]">
                <div className="grid grid-cols-5 gap-[3px]">
                    {Array.from({ length: 25 }).map((_, i) => {
                        const r = Math.floor(i / 5), c = i % 5;
                        return (
                            <span
                                key={i}
                                style={{
                                    width: 7, height: 7, borderRadius: 1.5,
                                    background: "#E5D3A6",
                                    animation: "aelo-cell 1.4s ease-in-out infinite",
                                    animationDelay: `${(r + c) * 90}ms`,
                                }}
                            />
                        );
                    })}
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="text-white text-[14px] font-semibold">Scanning Gemini</div>
                    <div className="text-zinc-600 text-[12.5px] tabular-nums">
                        {elapsed.toFixed(1)}s elapsed
                    </div>
                </div>
            </div>

            <div>
                {labels.map((label, i) => {
                    const done = i < active;
                    const isActive = i === active;
                    return (
                        <div key={i} className="flex items-center gap-3 py-[7px]">
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                {done ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="9" stroke="#E5D3A6" strokeWidth="1.5" />
                                        <path d="M8.5 12.5l2.4 2.4 4.6-5" stroke="#E5D3A6" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : isActive ? (
                                    <span
                                        style={{
                                            width: 16, height: 16, borderRadius: "50%",
                                            border: "1.8px solid rgba(255,255,255,0.15)",
                                            borderTopColor: "#F5F4F0",
                                            animation: "aelo-spin .7s linear infinite",
                                        }}
                                    />
                                ) : (
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#55555E" }} />
                                )}
                            </span>
                            <span
                                className={
                                    done
                                        ? "text-[14.5px] text-zinc-400"
                                        : isActive
                                            ? "text-[14.5px] text-white font-semibold"
                                            : "text-[14.5px] text-zinc-600"
                                }
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
