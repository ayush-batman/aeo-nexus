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
        <div className="rounded-sm border border-[#adb8b0] bg-[#fbfaf5] p-6 text-[#1d2523]">
            <style>{`
              @keyframes aelo-cell { 0%,100% { opacity: .12 } 50% { opacity: 1 } }
              @keyframes aelo-spin { to { transform: rotate(360deg) } }
            `}</style>

            <div className="flex items-baseline gap-2 mb-5">
                <span className="flex-shrink-0 text-base font-semibold text-[#1d2523]">
                    {brand.trim() || "Your brand"}
                </span>
                <span className="truncate text-sm text-[#586560]">
                    &middot; &ldquo;{prompt}&rdquo;
                </span>
            </div>

            <div className="mb-4 flex items-center gap-4 border-b border-[#d2d7cf] pb-5">
                <div className="grid grid-cols-5 gap-[3px]">
                    {Array.from({ length: 25 }).map((_, i) => {
                        const r = Math.floor(i / 5), c = i % 5;
                        return (
                            <span
                                key={i}
                                style={{
                                    width: 7, height: 7, borderRadius: 1.5,
                                    background: "#416A88",
                                    animation: "aelo-cell 1.4s ease-in-out infinite",
                                    animationDelay: `${(r + c) * 90}ms`,
                                }}
                            />
                        );
                    })}
                </div>
                <div className="flex flex-col gap-0.5">
                    <div className="text-sm font-semibold text-[#1d2523]">Scanning Gemini</div>
                    <div className="text-xs tabular-nums text-[#586560]">
                        {elapsed.toFixed(1)}s elapsed
                    </div>
                </div>
            </div>

            <div>
                {labels.map((label, i) => {
                    const done = i < active;
                    const isActive = i === active;
                    return (
                        <div key={i} className="flex items-center gap-3 py-2">
                            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                {done ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="9" stroke="#527D69" strokeWidth="1.5" />
                                        <path d="M8.5 12.5l2.4 2.4 4.6-5" stroke="#527D69" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : isActive ? (
                                    <span
                                        style={{
                                            width: 16, height: 16, borderRadius: "50%",
                                            border: "1.8px solid #D2D7CF",
                                            borderTopColor: "#416A88",
                                            animation: "aelo-spin .7s linear infinite",
                                        }}
                                    />
                                ) : (
                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A4AEAA" }} />
                                )}
                            </span>
                            <span
                                className={
                                    done
                                        ? "text-sm text-[#586560]"
                                        : isActive
                                            ? "text-sm font-semibold text-[#1d2523]"
                                            : "text-sm text-[#87928e]"
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
