"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// A selectable code block with a copy button, for the /mcp install snippets.
export function CopyBlock({ code, label }: { code: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    function copy() {
        navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <div className="rounded-lg border border-white/10 bg-[#0A0A0A] overflow-hidden">
            {label && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-mono">{label}</span>
                    <button
                        type="button"
                        onClick={copy}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-[var(--data-green)]" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            )}
            <pre className="overflow-x-auto px-4 py-3.5 text-[12.5px] leading-relaxed text-zinc-300 font-mono">
                <code>{code}</code>
            </pre>
        </div>
    );
}
