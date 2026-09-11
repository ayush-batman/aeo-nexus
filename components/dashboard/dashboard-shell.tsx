"use client";

import { useCallback, useRef, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigationButtonRef = useRef<HTMLButtonElement>(null);
  const openNavigation = useCallback(() => setMobileOpen(true), []);
  const closeNavigation = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="aelo-dashboard">
      <a
        href="#dashboard-content"
        className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-md bg-[var(--accent-base)] px-4 py-3 text-sm font-medium text-[var(--text-on-accent)] shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to dashboard content
      </a>
      <DashboardNavigation
        openNavigation={openNavigation}
        navigationButtonRef={navigationButtonRef}
      />
      <Sidebar
        collapsed={false}
        mobileOpen={mobileOpen}
        onCollapsedChange={() => {}}
        onMobileClose={closeNavigation}
        returnFocusRef={navigationButtonRef}
        drawerOnly
      />
      <main id="dashboard-content" tabIndex={-1} className="relative min-w-0">
        {children}
      </main>
    </div>
  );
}
