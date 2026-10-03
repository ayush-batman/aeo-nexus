"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const destinations = [
  { label: "Decision report", href: "/dashboard/report" },
  { label: "Workspace & access", href: "/dashboard/settings" },
] as const;

export function ReportsSettingsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Reports and settings" className="flex gap-7 border-b border-[var(--border-default)]">
      {destinations.map((destination) => {
        const active = pathname.startsWith(destination.href);
        return (
          <Link
            key={destination.href}
            href={destination.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 items-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              active && "text-[var(--text-primary)] after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-[var(--accent-base)]",
            )}
          >
            {destination.label}
          </Link>
        );
      })}
    </nav>
  );
}
