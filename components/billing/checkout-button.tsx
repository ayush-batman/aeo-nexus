"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

// window.Razorpay is typed globally in the settings page; use a local cast here
// to avoid a duplicate global declaration.
function getRazorpayCtor(): (new (options: Record<string, unknown>) => { open: () => void }) | undefined {
    return (window as unknown as { Razorpay?: new (o: Record<string, unknown>) => { open: () => void } }).Razorpay;
}

function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
        if (getRazorpayCtor()) return resolve(true);
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });
}

export function CheckoutButton({
    plan,
    label,
    className,
    primary = true,
}: {
    plan: "radar" | "command";
    label: string;
    className?: string;
    primary?: boolean;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function checkout() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/razorpay/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json();

            if (res.status === 401) {
                window.location.href = `/signup?plan=${plan}`;
                return;
            }
            if (!res.ok) {
                setError(data?.message || "Could not start checkout.");
                setLoading(false);
                return;
            }

            const ok = await loadRazorpay();
            const Ctor = getRazorpayCtor();
            if (!ok || !Ctor) {
                setError("Could not load the payment window. Check your connection.");
                setLoading(false);
                return;
            }

            const rzp = new Ctor({
                key: data.keyId,
                order_id: data.orderId,
                amount: data.amount,
                currency: data.currency,
                name: "Aelo",
                description: `${data.planName} plan`,
                theme: { color: "#B8933D" },
                handler: async (resp: {
                    razorpay_order_id: string;
                    razorpay_payment_id: string;
                    razorpay_signature: string;
                }) => {
                    const v = await fetch("/api/razorpay/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(resp),
                    });
                    if (v.ok) {
                        window.location.href = "/dashboard?upgraded=1";
                    } else {
                        const b = await v.json().catch(() => ({}));
                        setError(b?.error || "Payment captured but verification failed. Contact support.");
                        setLoading(false);
                    }
                },
                modal: { ondismiss: () => setLoading(false) },
            });
            rzp.open();
        } catch {
            setError("Something went wrong starting checkout.");
            setLoading(false);
        }
    }

    return (
        <div className="w-full">
            <button
                onClick={checkout}
                disabled={loading}
                className={
                    className ??
                    `inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 ${
                        primary
                            ? "bg-[var(--accent-base)] text-[var(--bg-base)]"
                            : "border border-[var(--border-default)] text-[var(--text-primary)]"
                    }`
                }
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Opening…" : label}
            </button>
            {error && <p className="mt-2 text-xs text-[var(--data-red)]">{error}</p>}
        </div>
    );
}
