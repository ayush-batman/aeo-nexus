"use client";

import { useEffect, useState, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";
import { AeloWordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

const jobs = [
  {
    label: "Overview",
    href: "/dashboard",
    match: (path: string) => path === "/dashboard",
  },
  {
    label: "Prompts & Scans",
    href: "/dashboard/llm-tracker",
    match: (path: string) => path.startsWith("/dashboard/llm-tracker"),
  },
  {
    label: "Sources",
    href: "/dashboard/sources",
    match: (path: string) => path.startsWith("/dashboard/sources"),
  },
  {
    label: "Actions",
    href: "/dashboard/interventions",
    match: (path: string) =>
      path.startsWith("/dashboard/interventions") ||
      path.startsWith("/dashboard/insights"),
  },
  {
    label: "Reports & Settings",
    href: "/dashboard/report",
    match: (path: string) =>
      path.startsWith("/dashboard/report") ||
      path.startsWith("/dashboard/settings"),
  },
] as const;

function setDocumentTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("aelo-dashboard-theme-v1", theme);
  } catch {
    // The selected theme still applies for this visit when storage is unavailable.
  }
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === "dark" ? "#131717" : "#E9ECE7";
}

export function DashboardNavigation({
  openNavigation,
  navigationButtonRef,
}: {
  openNavigation: () => void;
  navigationButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  function toggleTheme() {
    const next: Theme =
      document.documentElement.dataset.theme === "light" ? "dark" : "light";
    setDocumentTheme(next);
    setTheme(next);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--bg-base)]">
      <div className="mx-auto flex h-[76px] max-w-[1480px] items-center gap-8 px-5 sm:px-8 lg:px-10">
        <Link
          href="/dashboard"
          aria-label="Aelo overview"
          className="shrink-0"
        >
          <AeloWordmark size="lg" />
        </Link>
        <nav
          aria-label="Primary dashboard navigation"
          className="hidden h-full items-stretch gap-8 lg:flex"
        >
          {jobs.map((job) => {
            const active = job.match(pathname);
            return (
              <Link
                key={job.href}
                href={job.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center whitespace-nowrap text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]",
                  active &&
                    "text-[var(--text-primary)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[var(--accent-base)]",
                )}
              >
                {job.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-raised)] hover:text-[var(--text-primary)] sm:px-3"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="hidden xl:inline">
              {theme === "light" ? "Dark" : "Light"}
            </span>
          </button>
          <button
            ref={navigationButtonRef}
            type="button"
            onClick={openNavigation}
            aria-label="Open all dashboard tools"
            className="flex min-h-11 items-center justify-center gap-2 rounded-sm border border-[var(--border-default)] px-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-raised)]"
          >
            <span className="hidden sm:inline">All tools</span>
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
