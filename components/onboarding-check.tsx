"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialPathname = usePathname();
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialPathname === "/onboarding") {
      const timer = window.setTimeout(() => setState("ready"), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/onboarding/context", { cache: "no-store", signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) { router.replace("/login"); return; }
        if (!response.ok) throw new Error(data.error || "Workspace status could not be loaded.");
        if (!data.onboardingCompleted && !data.hasBrand) { router.replace("/onboarding"); return; }
        setState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, initialPathname, router]);

  if (state === "checking") {
    return <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]"><div className="space-y-3 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-base)] border-t-transparent" /><p className="text-sm text-[var(--text-secondary)]">Loading your workspace…</p></div></div>;
  }
  if (state === "error") {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-6"><div role="alert" className="max-w-md rounded-xl border border-[rgba(239,68,68,.25)] bg-[var(--data-red-muted)] p-6 text-center"><AlertCircle className="mx-auto h-6 w-6 text-[var(--data-red)]" /><h1 className="mt-3 text-lg font-medium text-[var(--text-primary)]">Workspace could not be loaded</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Your data has not been shown as empty. Check the connection and retry.</p><Button className="mt-4 min-h-11" variant="outline" onClick={() => { setState("checking"); setAttempt(value => value + 1); }}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div></div>;
  }
  return <>{children}</>;
}
