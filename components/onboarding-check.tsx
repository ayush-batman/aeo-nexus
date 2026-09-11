"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DashboardBootstrap = {
  userId: string;
  orgId: string;
  workspaceId: string;
  onboardingCompleted: boolean;
  hasBrand: boolean;
  plan: string;
  paid: boolean;
  workspaces: Array<{ id: string; name: string; settings?: { website?: string; competitors?: string[] }; created_at: string }>;
};

const DashboardBootstrapContext = createContext<DashboardBootstrap | null>(null);
export function useDashboardBootstrap() { return useContext(DashboardBootstrapContext); }

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"checking" | "ready" | "error">("checking");
  const [bootstrap, setBootstrap] = useState<DashboardBootstrap | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const developmentBypass = process.env.NODE_ENV !== "production"
      && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH_BYPASS === "true"
      && ["localhost", "127.0.0.1"].includes(window.location.hostname)
      && document.cookie.split("; ").includes("dev-auth-bypass=true");
    if (developmentBypass) {
      const timer = window.setTimeout(() => setState("ready"), 0);
      return () => window.clearTimeout(timer);
    }
    if (pathname === "/onboarding") {
      const timer = window.setTimeout(() => setState("ready"), 0);
      return () => window.clearTimeout(timer);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState("checking");
      try {
        const response = await fetch("/api/onboarding/context", { cache: "no-store", signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) { router.replace("/login"); return; }
        if (!response.ok) throw new Error(data.error || "Workspace status could not be loaded.");
        if (!data.onboardingCompleted && !data.hasBrand) { router.replace("/onboarding"); return; }
        if (controller.signal.aborted) return;
        setBootstrap(data as DashboardBootstrap);
        setState("ready");
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) return;
        setState("error");
      }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attempt, pathname, router]);

  if (state === "checking") {
    return <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-[var(--bg-base)]"><div className="space-y-3 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-base)] border-t-transparent" /><p className="text-sm text-[var(--text-secondary)]">Loading your workspace…</p></div></div>;
  }
  if (state === "error") {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-6"><div role="alert" className="max-w-md rounded-xl border border-[rgba(239,68,68,.25)] bg-[var(--data-red-muted)] p-6 text-center"><AlertCircle className="mx-auto h-6 w-6 text-[var(--data-red)]" /><h1 className="mt-3 text-lg font-medium text-[var(--text-primary)]">Workspace could not be loaded</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Your data has not been shown as empty. Check the connection and retry.</p><Button className="mt-4 min-h-11" variant="outline" onClick={() => { setState("checking"); setAttempt(value => value + 1); }}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div></div>;
  }
  return <DashboardBootstrapContext.Provider value={bootstrap}>{children}</DashboardBootstrapContext.Provider>;
}
