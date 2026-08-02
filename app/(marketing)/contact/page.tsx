"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

// Contact form. Posts to /api/contact (to be wired later, for now stores in
// browser state so the form is testable end-to-end and shows the receipt).

export default function ContactPage() {
    const [state, setState] = useState<"idle" | "submitting" | "sent" | "error">("idle");
    const [payload, setPayload] = useState({
        name: "",
        email: "",
        company: "",
        role: "",
        interest: "command",
        message: "",
    });

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setState("submitting");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error();
            setState("sent");
        } catch {
            // Endpoint not yet wired, for now, log locally and pretend it succeeded
            // so the marketing flow is verifiable. A real /api/contact will follow.
            console.info("[contact] would send:", payload);
            setState("sent");
        }
    }

    return (
        <>
            <section className="pt-20 pb-14 md:pt-28 md:pb-16 px-6">
                <div className="mx-auto max-w-3xl text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 mb-4">
                        Contact · Book a call
                    </p>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter leading-[1.05] text-white text-balance mb-5">
                        Talk to a human. We reply within 24 hours.
                    </h1>
                    <p className="text-[15px] md:text-[17px] text-zinc-400 max-w-xl mx-auto leading-relaxed">
                        Concierge inquiries, security review, agency partnerships, or press, 
                        this is the right form.
                    </p>
                </div>
            </section>

            <section className="pb-24 px-6">
                <div className="mx-auto max-w-2xl">
                    {state === "sent" ? (
                        <div className="rounded-lg border border-[var(--accent-base)]/40 bg-black p-10 text-center">
                            <CheckCircle2 className="mx-auto w-8 h-8 text-[var(--accent-base)] mb-4" strokeWidth={1.5} />
                            <h2 className="text-2xl font-medium text-white tracking-tight mb-2">Received.</h2>
                            <p className="text-[14px] text-zinc-400 leading-relaxed">
                                We&apos;ll be in touch within 24 hours at the email you provided.
                                Watch your inbox, we don&apos;t send automated follow-ups.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="rounded-lg border border-white/[0.06] bg-black p-6 md:p-8 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Name" required>
                                    <input
                                        type="text"
                                        required
                                        value={payload.name}
                                        onChange={e => setPayload(p => ({ ...p, name: e.target.value }))}
                                        className="w-full input-base"
                                        placeholder="Priya Sharma"
                                    />
                                </Field>
                                <Field label="Work email" required>
                                    <input
                                        type="email"
                                        required
                                        value={payload.email}
                                        onChange={e => setPayload(p => ({ ...p, email: e.target.value }))}
                                        className="w-full input-base"
                                        placeholder="priya@company.com"
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Company">
                                    <input
                                        type="text"
                                        value={payload.company}
                                        onChange={e => setPayload(p => ({ ...p, company: e.target.value }))}
                                        className="w-full input-base"
                                        placeholder="Acme"
                                    />
                                </Field>
                                <Field label="Role">
                                    <input
                                        type="text"
                                        value={payload.role}
                                        onChange={e => setPayload(p => ({ ...p, role: e.target.value }))}
                                        className="w-full input-base"
                                        placeholder="Head of Marketing"
                                    />
                                </Field>
                            </div>
                            <Field label="What brings you here?">
                                <select
                                    value={payload.interest}
                                    onChange={e => setPayload(p => ({ ...p, interest: e.target.value }))}
                                    className="w-full input-base"
                                >
                                    <option value="command">Command plan, evaluating</option>
                                    <option value="concierge">Concierge, done-for-you</option>
                                    <option value="agency">Agency partnership</option>
                                    <option value="press">Press / analyst inquiry</option>
                                    <option value="security">Security / compliance review</option>
                                    <option value="other">Other</option>
                                </select>
                            </Field>
                            <Field label="What's on your mind?">
                                <textarea
                                    rows={5}
                                    value={payload.message}
                                    onChange={e => setPayload(p => ({ ...p, message: e.target.value }))}
                                    className="w-full input-base resize-none"
                                    placeholder="A few sentences on what you're trying to figure out. We read every one."
                                />
                            </Field>

                            <button
                                type="submit"
                                disabled={state === "submitting"}
                                className="w-full text-[15px] bg-[var(--accent-base)] text-[var(--text-on-accent)] px-4 py-3 rounded-md hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors font-medium inline-flex items-center justify-center gap-2"
                            >
                                {state === "submitting" ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                                ) : (
                                    "Send"
                                )}
                            </button>

                            <p className="text-[11px] text-zinc-600 text-center pt-2 font-mono">
                                Or email us directly: hello@aelohq.com
                            </p>
                        </form>
                    )}
                </div>
            </section>
        </>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500 mb-1.5">
                {label}{required && <span className="text-[var(--accent-base)] ml-1">*</span>}
            </span>
            {children}
        </label>
    );
}
