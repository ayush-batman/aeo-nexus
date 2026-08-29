"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";

type DashboardShellContextValue = {
  openNavigation: () => void;
  navigationButtonRef: React.RefObject<HTMLButtonElement | null>;
};

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null);

export function useDashboardShell() {
  const value = useContext(DashboardShellContext);
  if (!value) throw new Error("useDashboardShell must be used inside DashboardShell.");
  return value;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const openNavigation = useCallback(() => setMobileOpen(true), []);
  const closeNavigation = useCallback(() => setMobileOpen(false), []);
  const context = useMemo(() => ({ openNavigation, navigationButtonRef }), [openNavigation]);

  return <DashboardShellContext.Provider value={context}>
    <div className="min-h-screen bg-[var(--bg-base)]">
      <a
        href="#dashboard-content"
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-md bg-[var(--accent-base)] px-4 py-3 text-sm font-medium text-[var(--text-on-accent)] shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to dashboard content
      </a>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapsedChange={setCollapsed}
        onMobileClose={closeNavigation}
        returnFocusRef={navigationButtonRef}
      />
      <main id="dashboard-content" tabIndex={-1} className={cn("relative min-w-0 transition-[padding] duration-200 lg:pl-60", collapsed && "lg:pl-16")}>
        {children}
      </main>
    </div>
  </DashboardShellContext.Provider>;
}
