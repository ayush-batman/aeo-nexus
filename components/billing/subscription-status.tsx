"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export interface BillingSummary {
    kind: "none" | "subscription" | "one_time";
    provider: "stripe" | "razorpay" | null;
    cancelsAt: number | null;
    paidUntil: number | null;
}

function formatDate(value: number): string {
    return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Renewal state of the current plan, with the cancel action for renewing subscriptions. */
export function SubscriptionStatus({ billing, onChanged }: { billing: BillingSummary; onChanged: () => void }) {
    const [open, setOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function cancel() {
        setCancelling(true);
        setError(null);
        try {
            const response = await fetch("/api/billing/cancel", { method: "POST" });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || "Could not cancel the subscription. Please retry.");
            setOpen(false);
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not cancel the subscription. Please retry.");
        } finally {
            setCancelling(false);
        }
    }

    if (billing.kind === "one_time" && billing.paidUntil !== null) {
        return (
            <p className="text-sm text-[var(--text-secondary)]">
                Paid until <span className="font-medium text-[var(--text-primary)]">{formatDate(billing.paidUntil)}</span>.
                This was a one-time payment and will not renew. Choose a monthly plan below to keep access.
            </p>
        );
    }

    if (billing.kind !== "subscription") return null;

    if (billing.cancelsAt !== null) {
        return (
            <p className="text-sm text-[var(--text-secondary)]">
                Cancelled. Your plan stays active until{" "}
                <span className="font-medium text-[var(--text-primary)]">{formatDate(billing.cancelsAt)}</span> and will not renew.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Renews monthly. Cancel any time; you keep the plan until the end of the period you paid for.</p>
            <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="min-h-11 sm:min-h-10">Cancel subscription</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel your subscription?</DialogTitle>
                        <DialogDescription>
                            You will not be charged again. Your plan stays active until the end of the current billing period, then your workspace moves to the Free plan.
                        </DialogDescription>
                    </DialogHeader>
                    {error && <p role="alert" className="text-sm text-[var(--data-red)]">{error}</p>}
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" disabled={cancelling} className="min-h-11 sm:min-h-10">Keep my plan</Button>
                        </DialogClose>
                        <Button onClick={cancel} disabled={cancelling} className="min-h-11 sm:min-h-10">
                            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            {cancelling ? "Cancelling…" : "Cancel subscription"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
