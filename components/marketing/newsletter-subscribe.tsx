"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type State = "idle" | "submitting" | "ok" | "error";

interface Props {
    // Where the signup happened — feeds analytics + list-segmentation later.
    source?: string;
    // Alternate copy for context (post footer vs blog hero).
    variant?: "hero" | "footer";
}

// Sage-quiet subscribe form. No modal, no popup, no urgency. One line of
// copy explaining what you get + one input + one button. On success, the
// form flips to a confirmation state that stays visible so the user knows
// it worked — no toast that flickers away.
export function NewsletterSubscribe({ source, variant = "hero" }: Props) {
    const [email, setEmail]     = useState("");
    const [state, setState]     = useState<State>("idle");
    const [message, setMessage] = useState<string>("");

    const isFooter = variant === "footer";

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        setState("submitting");
        try {
            const res = await fetch("/api/newsletter/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), source }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setState("error");
                setMessage(
                    data?.error === "invalid_email"
                        ? "That doesn't look like a valid email address."
                        : "Something went wrong. Try again in a moment.",
                );
                return;
            }
            setState("ok");
            setMessage(
                data.status === "already_subscribed"
                    ? "You're already on the list — nothing more to do."
                    : "You're in. Next post lands in your inbox.",
            );
            setEmail("");
        } catch {
            setState("error");
            setMessage("Network error. Try again.");
        }
    }

    if (state === "ok") {
        return (
            <div
                className={
                    isFooter
                        ? "rounded-md border border-[var(--accent-base)]/25 bg-black p-5"
                        : "rounded-md border border-[var(--accent-base)]/25 bg-black p-4"
                }
            >
                <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-[var(--accent-base)] flex-shrink-0" />
                    <div>
                        <div className="text-[13.5px] font-medium text-white mb-0.5">
                            Subscribed.
                        </div>
                        <div className="text-[12.5px] text-zinc-400 leading-relaxed">
                            {message}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={
                isFooter
                    ? "rounded-md border border-white/[0.06] bg-black p-5"
                    : "rounded-md border border-white/[0.06] bg-black p-4"
            }
        >
            <div className="mb-3">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1.5">
                    {isFooter ? "Get the next one by email" : "Subscribe"}
                </div>
                <p className="text-[12.5px] text-zinc-400 leading-relaxed">
                    {isFooter
                        ? "One email when a new post drops. No newsletter fluff, no 'top-of-mind' spam."
                        : "New analysis, methodology notes, and monthly India Index editions — straight to your inbox."}
                </p>
            </div>
            <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
                <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@work.com"
                    disabled={state === "submitting"}
                    className="flex-1 px-3 py-2 text-[13px] bg-[#050506] border border-white/[0.08] rounded-md text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--accent-base)]/40 transition-colors font-mono"
                />
                <button
                    type="submit"
                    disabled={state === "submitting" || !email.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] bg-[var(--accent-base)] text-[var(--text-on-accent)] rounded-md hover:bg-[var(--accent-hover)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {state === "submitting" ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Subscribing
                        </>
                    ) : (
                        "Subscribe"
                    )}
                </button>
            </form>
            {state === "error" && (
                <p className="mt-2 text-[11.5px] text-[var(--data-red)] font-mono">{message}</p>
            )}
            <p className="mt-2 text-[10.5px] font-mono text-zinc-600">
                No open tracking. Unsubscribe with one click. Never sold.
            </p>
        </div>
    );
}
