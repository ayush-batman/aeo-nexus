"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyBlock } from "./copy-block";
import { KeyRound, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const config = (key: string) => `{
  "mcpServers": {
    "aelo": {
      "command": "npx",
      "args": ["-y", "@aelo/mcp"],
      "env": {
        "AELO_API_KEY": "${key}",
        "AELO_API_BASE": "https://aelohq.com/api/v1"
      }
    }
  }
}`;

const prompt = (key: string) =>
    `Add the Aelo MCP server to my config. Run it with "npx -y @aelo/mcp", and set env AELO_API_KEY to ${key} and AELO_API_BASE to https://aelohq.com/api/v1. Then call get_visibility_overview for my brand.`;

type Status = "idle" | "loading" | "anon" | "error";

// Interactive install: logged-in users can mint a real key inline and have it
// filled into both snippets. Logged-out users get the placeholder + a sign-in
// nudge. The secret is shown exactly once, so we never persist or refetch it.
export function McpInstall() {
    const [secret, setSecret] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>("idle");

    async function generate() {
        setStatus("loading");
        try {
            const res = await fetch("/api/keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "MCP" }),
            });
            if (res.status === 401) {
                setStatus("anon");
                return;
            }
            const data = await res.json();
            if (!res.ok) {
                setStatus("error");
                return;
            }
            setSecret(data.secret);
            setStatus("idle");
        } catch {
            setStatus("error");
        }
    }

    const key = secret ?? "alo_live_your_key_here";

    return (
        <ol className="mt-8 space-y-8">
            <li>
                <div className="flex items-center gap-3 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-[13px] flex items-center justify-center font-mono">1</span>
                    <p className="text-sm text-zinc-300">Create a read-only key.</p>
                </div>
                <div className="pl-9">
                    {secret ? (
                        <div className="rounded-lg border border-[var(--data-green)]/30 bg-[var(--data-green)]/[0.06] p-4">
                            <div className="flex items-center gap-2 text-[var(--data-green)] text-sm mb-2">
                                <CheckCircle2 className="h-4 w-4" /> Key created and filled into the snippets below. Copy it now, you will not see it again.
                            </div>
                            <code className="text-[13px] text-white font-mono break-all">{secret}</code>
                        </div>
                    ) : status === "anon" ? (
                        <p className="text-sm text-zinc-400">
                            <Link href="/login" className="text-[var(--accent-base)] hover:text-[var(--accent-hover)]">
                                Log in
                            </Link>{" "}
                            to generate a key, or create one anytime in{" "}
                            <Link href="/dashboard/settings?tab=api" className="text-[var(--accent-base)] hover:text-[var(--accent-hover)]">
                                Settings → API keys
                            </Link>
                            .
                        </p>
                    ) : (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={generate}
                                disabled={status === "loading"}
                                className="inline-flex items-center gap-2 text-sm bg-white/10 hover:bg-white/[0.16] text-white px-4 py-2 rounded-md transition-colors disabled:opacity-60"
                            >
                                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                Generate a key
                            </button>
                            {status === "error" && (
                                <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--data-red)]">
                                    <AlertCircle className="h-3.5 w-3.5" /> Something went wrong. Try Settings → API keys.
                                </span>
                            )}
                            <span className="text-[13px] text-zinc-500">signed in to Aelo</span>
                        </div>
                    )}
                </div>
            </li>
            <li>
                <div className="flex items-center gap-3 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-[13px] flex items-center justify-center font-mono">2</span>
                    <p className="text-sm text-zinc-300">Add Aelo to your assistant.</p>
                </div>
                <CopyBlock label="claude_desktop_config.json · or ~/.cursor/mcp.json" code={config(key)} />
            </li>
            <li>
                <div className="flex items-center gap-3 mb-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-[13px] flex items-center justify-center font-mono">3</span>
                    <p className="text-sm text-zinc-300">Or paste this prompt into your assistant and let it wire itself up.</p>
                </div>
                <CopyBlock label="Install prompt" code={prompt(key)} />
            </li>
        </ol>
    );
}
